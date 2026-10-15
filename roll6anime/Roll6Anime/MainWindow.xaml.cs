using System.Collections.Specialized;
using System.ComponentModel;
using System.Windows;
using System.Windows.Input;
using Microsoft.Win32;
using Roll6Anime.Core.Claude;
using Roll6Anime.Core.Markup;
using Roll6Anime.Core.Settings;

namespace Roll6Anime;

/// <summary>
/// The roll6anime window (062): models and animations on the left, the 3D view in the middle, the conversation with
/// the local Claude on the right. The state lives in <see cref="MainViewModel"/>.
/// </summary>
public partial class MainWindow : Window
{
    private readonly MainViewModel _model;
    private readonly ViewerBridge _viewer;
    private Conversation? _followed;

    public MainWindow(AnimeSettings settings, UserState state)
    {
        InitializeComponent();
        _viewer = new ViewerBridge(Viewer);
        _model = new MainViewModel(settings, state, _viewer, Dispatcher);
        DataContext = _model;
        _model.PropertyChanged += OnModelChanged;
        Follow(_model.Conversation);
        Loaded += OnLoaded;
        Closed += (_, _) => _model.Dispose();
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            await _viewer.InitializeAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(this,
                $"Não foi possível abrir a vista 3D (WebView2): {ex.Message}\n\nInstale o runtime WebView2 da Microsoft.",
                "roll6anime", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        _model.Start();
        PromptBox.Focus();
    }

    private void OnOpenModel(object sender, RoutedEventArgs e)
    {
        var dialog = new OpenFileDialog { Title = "Abrir modelo 3D", Filter = "Modelo 3D (*.glb)|*.glb", CheckFileExists = true };
        if (_model.ModelPath is { } current)
            dialog.InitialDirectory = System.IO.Path.GetDirectoryName(current);
        if (dialog.ShowDialog(this) == true)
            _model.OpenModel(dialog.FileName);
    }

    private void OnNewAnimation(object sender, RoutedEventArgs e) => _model.NewAnimation();

    private void OnNewConversation(object sender, RoutedEventArgs e) => _model.NewConversation();

    private async void OnSend(object sender, RoutedEventArgs e) => await _model.SendAsync();

    private void OnStop(object sender, RoutedEventArgs e) => _model.Stop();

    /// <summary>"Anexar print" (064, Q1 = B): the print opens in the markup editor; Concluir attaches it, Cancelar drops it.</summary>
    private async void OnCapture(object sender, RoutedEventArgs e)
    {
        if (await _model.CapturePrintAsync() is { } print && Mark(print) is { } done)
            _model.AddAttachment(done);
        PromptBox.Focus();
    }

    /// <summary>A click on a print's thumbnail opens it again in the editor, with its marks.</summary>
    private void OnOpenAttachment(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (!_model.CanEditPrompt || (sender as FrameworkElement)?.DataContext is not PrintAttachment print)
            return;
        e.Handled = true;
        if (Mark(print) is { } done)
            _model.ReplaceAttachment(print, done);
        PromptBox.Focus();
    }

    private PrintAttachment? Mark(PrintAttachment print)
    {
        var editor = new MarkupWindow(print) { Owner = this };
        return editor.ShowDialog() == true ? editor.Result : null;
    }

    private void OnRemoveAttachment(object sender, RoutedEventArgs e)
    {
        if ((sender as FrameworkElement)?.DataContext is PrintAttachment print)
            _model.RemoveAttachment(print);
    }

    /// <summary>Enter sends, Shift+Enter breaks the line.</summary>
    private async void OnPromptKey(object sender, KeyEventArgs e)
    {
        if (e.Key != Key.Enter || Keyboard.Modifiers.HasFlag(ModifierKeys.Shift))
            return;
        e.Handled = true;
        await _model.SendAsync();
    }

    private void OnModelChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(MainViewModel.Conversation))
            Follow(_model.Conversation);
        else if (e.PropertyName == nameof(MainViewModel.IsRunning) && !_model.IsRunning)
            PromptBox.Focus();
    }

    /// <summary>The conversation shown scrolls to its end when it changes or grows.</summary>
    private void Follow(Conversation conversation)
    {
        if (_followed != null)
            _followed.Messages.CollectionChanged -= OnMessagesChanged;
        _followed = conversation;
        conversation.Messages.CollectionChanged += OnMessagesChanged;
        foreach (var message in conversation.Messages)
            message.PropertyChanged -= OnMessageChanged;
        foreach (var message in conversation.Messages)
            message.PropertyChanged += OnMessageChanged;
        ScrollToEnd();
    }

    private void OnMessagesChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        if (e.NewItems != null)
            foreach (ConversationMessage message in e.NewItems)
                message.PropertyChanged += OnMessageChanged;
        ScrollToEnd();
    }

    private void OnMessageChanged(object? sender, PropertyChangedEventArgs e) => ScrollToEnd();

    private void ScrollToEnd() => Dispatcher.BeginInvoke(() => MessagesScroll.ScrollToEnd(), System.Windows.Threading.DispatcherPriority.Background);
}
