using System.Collections.ObjectModel;
using System.ComponentModel;
using System.IO;
using System.Runtime.CompilerServices;
using System.Windows.Threading;
using Roll6Anime.Core.Animations;
using Roll6Anime.Core.Claude;
using Roll6Anime.Core.Markup;
using Roll6Anime.Core.Settings;

namespace Roll6Anime;

/// <summary>
/// The window's state (062): the animations of the folder (followed in real time), the model, and the conversation
/// with the local Claude of the open animation. Never writes an animation file (FR-009).
/// </summary>
public sealed class MainViewModel : INotifyPropertyChanged, IDisposable
{
    /// <summary>Most prints one request carries.</summary>
    public const int MAX_ATTACHMENTS = 5;
    private const string NOT_MIXAMO = "O esqueleto deste modelo não usa os nomes do Mixamo: as animações não se aplicam a ele.";

    private readonly AnimeSettings _settings;
    private readonly UserState _state;
    private readonly ViewerBridge _viewer;
    private readonly Dispatcher _dispatcher;
    private readonly ConversationBook _book = new();
    private FolderWatcher? _watcher;
    private AnimationEntry? _selected;
    private string? _modelPath;
    private string? _modelWarning;
    private string? _status;
    private string _prompt = string.Empty;
    private bool _isRunning;
    private bool _capturing;
    private CancellationTokenSource? _running;
    /// <summary>True while a request of the "nova animação" conversation runs: the next new file is adopted (FR-015).</summary>
    private bool _creating;
    /// <summary>The selection changes made by the code (a re-read, an adoption) must not restart the animation.</summary>
    private bool _quietSelection;

    public MainViewModel(AnimeSettings settings, UserState state, ViewerBridge viewer, Dispatcher dispatcher)
    {
        _settings = settings;
        _state = state;
        _viewer = viewer;
        _dispatcher = dispatcher;
        _viewer.ModelLoaded += OnModelLoaded;
        _viewer.ModelError += message => { ModelWarning = $"Não foi possível abrir o modelo: {message}"; };
        _viewer.AnimationError += message => { Status = message; };
        Conversation = _book.For(null);
        Attachments.CollectionChanged += (_, _) => { OnChanged(nameof(HasAttachments)); OnChanged(nameof(CanSend)); OnChanged(nameof(CanCapture)); };
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public ObservableCollection<AnimationEntry> Animations { get; } = new();

    public AnimationEntry? SelectedAnimation
    {
        get => _selected;
        set
        {
            if (ReferenceEquals(_selected, value))
                return;
            _selected = value;
            OnChanged();
            OnChanged(nameof(SelectedError));
            OnChanged(nameof(ConversationTitle));
            if (_quietSelection)
                return;
            Select(value);
        }
    }

    /// <summary>The error of the open animation, shown over the view ("content.tracks[2].bone: …").</summary>
    public string? SelectedError => _selected?.Error?.ToString();

    public string? ModelPath
    {
        get => _modelPath;
        private set { _modelPath = value; OnChanged(); OnChanged(nameof(ModelName)); OnChanged(nameof(CanCapture)); }
    }

    public string ModelName => _modelPath == null ? "Nenhum modelo aberto" : Path.GetFileName(_modelPath);

    public string? ModelWarning
    {
        get => _modelWarning;
        private set { _modelWarning = value; OnChanged(); }
    }

    /// <summary>The last notice of the window: a configuration problem, a removed file.</summary>
    public string? Status
    {
        get => _status;
        private set { _status = value; OnChanged(); }
    }

    public string AnimationsFolder => _settings.AnimationsFolder;

    /// <summary>The conversation of the open animation (or of a new one); the screen shows its messages.</summary>
    public Conversation Conversation { get; private set; }

    public string ConversationTitle => _selected == null ? "Conversa: nova animação" : $"Conversa: {_selected.FileName}";

    public string Prompt
    {
        get => _prompt;
        set { _prompt = value; OnChanged(); OnChanged(nameof(CanSend)); }
    }

    /// <summary>Prints of the 3D view waiting to go with the next request; cleared when it is sent.</summary>
    public ObservableCollection<PrintAttachment> Attachments { get; } = new();

    public bool HasAttachments => Attachments.Count > 0;

    /// <summary>"Anexar print": a model on screen, no request running, room for one more.</summary>
    public bool CanCapture => !_isRunning && !_capturing && _modelPath != null && Attachments.Count < MAX_ATTACHMENTS;

    public bool IsRunning
    {
        get => _isRunning;
        private set { _isRunning = value; OnChanged(); OnChanged(nameof(CanSend)); OnChanged(nameof(CanEditPrompt)); OnChanged(nameof(CanCapture)); }
    }

    public bool CanEditPrompt => !_isRunning;

    /// <summary>Why requests cannot be sent (the Claude's folder is missing), or null.</summary>
    public string? SendBlockedReason => _settings.CheckClaudeWorkingDirectory();

    public bool CanSend => !_isRunning && (!string.IsNullOrWhiteSpace(_prompt) || Attachments.Count > 0) && SendBlockedReason == null;

    /// <summary>Lists and follows the folder, and reopens the last model (US1, US3, US4).</summary>
    public void Start()
    {
        if (_settings.CheckAnimationsFolder() is { } missing)
            Status = missing;
        else
        {
            foreach (var entry in AnimationFolder.List(_settings.AnimationsFolder))
                Animations.Add(entry);
            _watcher = new FolderWatcher(_settings.AnimationsFolder);
            _watcher.FileSettled += name => _dispatcher.BeginInvoke(() => OnFileSettled(name));
            _watcher.FileRemoved += name => _dispatcher.BeginInvoke(() => OnFileRemoved(name));
            _watcher.FileRenamed += (from, to) => _dispatcher.BeginInvoke(() => OnFileRenamed(from, to));
            _watcher.FolderReset += () => _dispatcher.BeginInvoke(Relist);
            _watcher.Start();
        }
        if (SendBlockedReason is { } blocked && Status == null)
            Status = blocked;
        if (_state.LastModel is { } last && File.Exists(last))
            OpenModel(last);
    }

    public void OpenModel(string path)
    {
        ModelPath = path;
        ModelWarning = null;
        _viewer.OpenModel(path);
    }

    private void OnModelLoaded(bool mixamo)
    {
        ModelWarning = mixamo ? null : NOT_MIXAMO;
        if (_modelPath != null)
        {
            _state.LastModel = _modelPath;
            _state.Save();
        }
    }

    /// <summary>The user picked an animation: it plays from the start, and its conversation comes up (Q3 = A).</summary>
    private void Select(AnimationEntry? entry)
    {
        ShowConversation(_book.For(entry?.FileName));
        if (entry == null)
            _viewer.Clear();
        else if (entry.Content != null)
            _viewer.ShowAnimation(entry, keepTime: false);
        else
            _viewer.Clear();
    }

    /// <summary>"Nova animação": nothing selected, so the next request creates a file.</summary>
    public void NewAnimation() => SelectedAnimation = null;

    /// <summary>"Nova conversa": the open animation's conversation starts again.</summary>
    public void NewConversation()
    {
        if (_isRunning)
            return;
        ShowConversation(_book.Reset(_selected?.FileName));
    }

    private void ShowConversation(Conversation conversation)
    {
        Conversation = conversation;
        OnChanged(nameof(Conversation));
        OnChanged(nameof(ConversationTitle));
    }

    /// <summary>
    /// "Anexar print": the 3D view as it is now — the pose of this instant from the user's camera — with a caption saying
    /// which animation, which instant and from where the camera looks. The window opens it in the markup editor (064) and
    /// attaches it on Concluir; null when nothing could be captured (the status says why).
    /// </summary>
    public async Task<PrintAttachment?> CapturePrintAsync()
    {
        if (!CanCapture)
            return null;
        _capturing = true;
        OnChanged(nameof(CanCapture));
        try
        {
            var capture = await _viewer.CaptureAsync();
            var animation = capture.Time != null && _selected != null
                ? PromptContext.Relative(_settings.ClaudeWorkingDirectory, _selected.FullPath)
                : null;
            return PrintAttachment.Plain(capture.Png, capture.Caption(animation));
        }
        catch (Exception ex)
        {
            Status = $"Não foi possível capturar a vista 3D: {ex.Message}";
            return null;
        }
        finally
        {
            _capturing = false;
            OnChanged(nameof(CanCapture));
        }
    }

    /// <summary>A print the editor finished (064): it joins the next request.</summary>
    public void AddAttachment(PrintAttachment print)
    {
        if (!_isRunning && Attachments.Count < MAX_ATTACHMENTS)
            Attachments.Add(print);
    }

    /// <summary>A print marked again in the editor takes the place of the one it was.</summary>
    public void ReplaceAttachment(PrintAttachment old, PrintAttachment print)
    {
        var index = Attachments.IndexOf(old);
        if (!_isRunning && index >= 0)
            Attachments[index] = print;
    }

    public void RemoveAttachment(PrintAttachment print)
    {
        if (!_isRunning)
            Attachments.Remove(print);
    }

    /// <summary>Sends the request to the local Claude with the screen's context (US2, FR-010–FR-014).</summary>
    public async Task SendAsync()
    {
        if (!CanSend)
            return;
        var images = Attachments.Select(print => print.ToPromptImage()).ToList();
        var text = _prompt.Trim();
        if (text.Length == 0)
            text = "Veja a imagem anexada.";
        Prompt = string.Empty;
        Attachments.Clear();
        var conversation = Conversation;
        var entry = _selected;
        _creating = entry == null;
        conversation.Messages.Add(new ConversationMessage(ConversationRole.User, text, images.Select(image => image.Png).ToList()));
        ConversationMessage? answer = null;
        var progress = new Progress<ClaudeEvent>(claudeEvent =>
        {
            switch (claudeEvent)
            {
                case ClaudeStarted { UsesAccount: false }:
                    conversation.Messages.Add(new ConversationMessage(ConversationRole.Notice,
                        "Atenção: o Claude Code está usando uma chave de API, não o login da conta."));
                    break;
                case ClaudeTextDelta delta:
                    if (answer == null)
                    {
                        answer = new ConversationMessage(ConversationRole.Claude, string.Empty);
                        conversation.Messages.Add(answer);
                    }
                    answer.Text += delta.Text;
                    break;
                case ClaudeToolUse tool:
                    conversation.Messages.Add(new ConversationMessage(ConversationRole.Notice, tool.Describe()));
                    // What comes after a tool is a new paragraph of the answer.
                    answer = null;
                    break;
            }
        });

        IsRunning = true;
        _running = new CancellationTokenSource();
        try
        {
            var context = PromptContext.Build(_settings, entry?.FullPath, _modelPath);
            var outcome = await ClaudeRunner.RunAsync(_settings, conversation, context, text, images, progress, _running.Token);
            if (outcome.Kind != ClaudeOutcomeKind.Done)
                conversation.Messages.Add(new ConversationMessage(ConversationRole.Notice, outcome.Message ?? "O pedido falhou."));
            if (outcome.PermissionDenials is { Count: > 0 } denials)
                conversation.Messages.Add(new ConversationMessage(ConversationRole.Notice,
                    $"O Claude não teve permissão para: {string.Join(", ", denials.Distinct())}."));
        }
        catch (Exception ex)
        {
            conversation.Messages.Add(new ConversationMessage(ConversationRole.Notice, $"O pedido falhou: {ex.Message}"));
        }
        finally
        {
            _running.Dispose();
            _running = null;
            _creating = false;
            IsRunning = false;
        }
    }

    /// <summary>"Parar": the Claude's process is killed and the request ends as stopped.</summary>
    public void Stop() => _running?.Cancel();

    private int IndexOf(string fileName)
    {
        for (var i = 0; i < Animations.Count; i++)
            if (string.Equals(Animations[i].FileName, fileName, StringComparison.OrdinalIgnoreCase))
                return i;
        return -1;
    }

    /// <summary>A file of the folder changed (US2, US3, FR-008): read it; the open one plays its new valid version.</summary>
    private void OnFileSettled(string fileName)
    {
        var path = Path.Combine(_settings.AnimationsFolder, fileName);
        if (!File.Exists(path))
            return;
        var index = IndexOf(fileName);
        var previous = index >= 0 ? Animations[index] : null;
        var entry = AnimationFolder.Read(path, previous);
        var wasSelected = previous != null && ReferenceEquals(previous, _selected);

        if (index >= 0)
            Replace(index, entry, wasSelected);
        else
            Insert(entry);

        if (wasSelected)
        {
            // A valid version replaces what plays, from the same instant; an invalid one only shows its error.
            if (entry.IsValid)
                _viewer.ShowAnimation(entry, keepTime: true);
        }
        else if (previous == null && _creating)
        {
            // The file the Claude created for the "nova animação" request (FR-015).
            _book.Adopt(fileName);
            _creating = false;
            SelectedAnimation = entry;
        }
    }

    private void OnFileRemoved(string fileName)
    {
        var index = IndexOf(fileName);
        if (index < 0)
            return;
        var removed = Animations[index];
        if (ReferenceEquals(removed, _selected))
        {
            _quietSelection = true;
            SelectedAnimation = null;
            _quietSelection = false;
            _viewer.Clear();
            ShowConversation(_book.For(null));
            Status = $"A animação {removed.FileName} foi apagada da pasta.";
        }
        Animations.RemoveAt(index);
    }

    private void OnFileRenamed(string oldName, string newName)
    {
        var index = IndexOf(oldName);
        _book.Rename(oldName, newName);
        if (index < 0)
            return;
        var old = Animations[index];
        var wasSelected = ReferenceEquals(old, _selected);
        var renamed = AnimationFolder.Read(Path.Combine(_settings.AnimationsFolder, newName), old);
        Animations.RemoveAt(index);
        Insert(renamed, wasSelected);
        if (wasSelected)
            OnChanged(nameof(ConversationTitle));
    }

    /// <summary>The watcher lost events: list the folder again, keeping the selection by name.</summary>
    private void Relist()
    {
        var selectedName = _selected?.FileName;
        _quietSelection = true;
        Animations.Clear();
        foreach (var entry in AnimationFolder.List(_settings.AnimationsFolder))
            Animations.Add(entry);
        SelectedAnimation = selectedName == null ? null : Animations.FirstOrDefault(entry =>
            string.Equals(entry.FileName, selectedName, StringComparison.OrdinalIgnoreCase));
        _quietSelection = false;
        if (_selected != null)
            _viewer.ShowAnimation(_selected, keepTime: true);
    }

    private void Replace(int index, AnimationEntry entry, bool select)
    {
        _quietSelection = true;
        Animations[index] = entry;
        if (select)
            SelectedAnimation = entry;
        _quietSelection = false;
    }

    private void Insert(AnimationEntry entry, bool select = false)
    {
        var index = 0;
        while (index < Animations.Count && string.Compare(Animations[index].FileName, entry.FileName, StringComparison.OrdinalIgnoreCase) < 0)
            index++;
        _quietSelection = true;
        Animations.Insert(index, entry);
        if (select)
            SelectedAnimation = entry;
        _quietSelection = false;
    }

    private void OnChanged([CallerMemberName] string? name = null) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));

    public void Dispose()
    {
        _running?.Cancel();
        _watcher?.Dispose();
    }
}
