using Roll6.Console.Claude;
using Roll6.Console.Codex;
using Roll6.Console.Files;
using Roll6.Console.Settings;
using Roll6.Console.Tools;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Console.Bridge;

/// <summary>What the runner reports back to the server (the hub, or a fake in tests).</summary>
public interface IRequestReporter
{
    Task ProgressAsync(long requestId, ClaudeEventInfo claudeEvent);
    Task FileChangedAsync(long requestId, FileChangedInfo info);
    Task FinishedAsync(long requestId, RequestOutcomeInfo outcome);

    /// <summary>A call of one of the run's tools (094), answered by the server.</summary>
    Task<ToolResultInfo> CallToolAsync(long requestId, ToolCallInfo call, CancellationToken cancellation);
}

/// <summary>
/// Executes one <see cref="RunInfo"/> at a time (086): writes the files the server sent, watches the paths it named, runs
/// the Claude with the system prompt and the prompt it built, relays every event, reports each watched file that settles
/// (also for <see cref="AfterRun"/> after the result line, since the last write may land after it) and ends with the
/// outcome. It never reads, validates or interprets the contents — the server does.
/// </summary>
public sealed class RequestRunner
{
    public const string BUSY = "Já há um pedido em andamento neste console.";

    /// <summary>How long the watcher keeps following the files after the Claude ended.</summary>
    public static readonly TimeSpan AfterRun = TimeSpan.FromSeconds(30);

    private readonly ConsoleSettings _settings;
    private readonly IClaudeProcess _claude;
    private readonly IRequestReporter _reporter;
    private readonly Action<string> _log;
    private readonly IToolHostFactory _toolHosts;
    private readonly IClaudeProcess _codex;
    private readonly object _lock = new();
    private long? _running;
    private CancellationTokenSource? _cancellation;

    public RequestRunner(ConsoleSettings settings, IClaudeProcess claude, IRequestReporter reporter, Action<string>? log = null,
        IToolHostFactory? toolHosts = null, IClaudeProcess? codex = null)
    {
        _settings = settings;
        _claude = claude;
        _reporter = reporter;
        _log = log ?? (_ => { });
        _toolHosts = toolHosts ?? LocalToolServer.Factory;
        _codex = codex ?? new CodexRunner(settings);
    }

    /// <summary>095: where the request's pictures are written for the Codex (<c>-i</c>), inside the working directory.</summary>
    public static string AttachmentPath(long requestId, int index) => $".roll6/anexos/{requestId}/{index}.png";

    /// <summary>The id of the request running now, or null.</summary>
    public long? Running
    {
        get { lock (_lock) return _running; }
    }

    /// <summary>Runs the request to its end; refuses a second one while the first runs (reported as failed).</summary>
    public async Task RunAsync(RunInfo run, TimeSpan? afterRun = null)
    {
        CancellationTokenSource cancellation;
        lock (_lock)
        {
            if (_running != null)
            {
                _ = _reporter.FinishedAsync(run.RequestId, new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = BUSY });
                return;
            }
            _running = run.RequestId;
            _cancellation = cancellation = new CancellationTokenSource();
        }
        try
        {
            _log(run.ReadOnly
                ? $"Pedido #{run.RequestId} (pergunta, somente leitura): rodando o Claude…"
                : run.IsCodex
                    ? $"Pedido #{run.RequestId}: rodando o Codex…"
                    : $"Pedido #{run.RequestId}: rodando o Claude…");
            var outcome = await ExecuteAsync(run, cancellation.Token, afterRun ?? AfterRun);
            _log($"Pedido #{run.RequestId} terminado.");
            await _reporter.FinishedAsync(run.RequestId, outcome);
        }
        finally
        {
            lock (_lock)
            {
                _running = null;
                _cancellation = null;
            }
            cancellation.Dispose();
        }
    }

    /// <summary>Kills the running request (its outcome comes back as Stopped); nothing for another id.</summary>
    public void Stop(long requestId)
    {
        lock (_lock)
        {
            if (_running == requestId)
                _cancellation?.Cancel();
        }
    }

    /// <summary>Files the server sends outside a request (<c>writeFiles</c>): written, nothing else.</summary>
    public void WriteFiles(IEnumerable<FileWriteInfo> files, FileWatcher? watcher = null)
    {
        foreach (var file in files)
        {
            try
            {
                var full = FileWriter.Resolve(_settings.ClaudeWorkingDirectory, file.Path);
                if (full == null)
                {
                    _log($"Ignorado (fora da pasta de trabalho): {file.Path}");
                    continue;
                }
                watcher?.Ignore(full, file.Content);
                var written = file.IsBase64
                    ? FileWriter.WriteBytes(_settings.ClaudeWorkingDirectory, file.Path, file.Content)
                    : FileWriter.Write(_settings.ClaudeWorkingDirectory, file.Path, file.Content);
                if (written)
                    _log($"Arquivo gravado: {file.Path}");
            }
            catch (Exception ex) when (ex is IOException or FormatException)
            {
                _log($"Falha ao gravar {file.Path}: {ex.Message}");
            }
        }
    }

    private async Task<RequestOutcomeInfo> ExecuteAsync(RunInfo run, CancellationToken cancellation, TimeSpan afterRun)
    {
        var root = _settings.ClaudeWorkingDirectory;
        if (_settings.CheckClaudeWorkingDirectory() is { } missing)
            return new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = missing };
        // 093: a read-only run writes and watches nothing, whatever came with it (094: and offers no tools).
        if (run.ReadOnly)
            run = new RunInfo
            {
                RequestId = run.RequestId, SessionId = run.SessionId, Started = false, SystemPrompt = run.SystemPrompt,
                Prompt = run.Prompt, Images = run.Images, ReadOnly = true,
            };
        if (run.Files.Any(f => FileWriter.Resolve(root, f.Path) == null) || run.Watch.Any(w => FileWriter.Resolve(root, w.TrimEnd('/', '\\')) == null))
            return new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = FileWriter.OUTSIDE };

        using var watcher = new FileWatcher(root, run.Watch);
        var reports = new List<Task>();
        watcher.FileSettled += (path, content) =>
        {
            _log($"Arquivo alterado: {path}");
            lock (reports)
                reports.Add(_reporter.FileChangedAsync(run.RequestId, new FileChangedInfo
                {
                    Path = path,
                    Content = content,
                    // 095: images travel as their bytes.
                    Encoding = FileWriter.IsBinary(path) ? FileEncodings.BASE64 : null,
                }));
        };
        watcher.FileTooLarge += (path, length) =>
        {
            _log($"Imagem grande demais: {path}");
            lock (reports)
                reports.Add(_reporter.ProgressAsync(run.RequestId, new ClaudeEventInfo
                {
                    Kind = ClaudeEventInfo.NOTICE,
                    Text = $"Imagem grande demais: {path} ({length / (1024.0 * 1024.0):0.0} MB; o limite é 10 MB).",
                }));
        };
        // The files the server sent are written before the watcher starts, so their own write is never reported.
        WriteFiles(run.Files, watcher);
        watcher.Start();

        var progress = new SyncProgress<ClaudeEvent>(claudeEvent =>
        {
            var info = ToInfo(claudeEvent);
            if (info == null)
                return;
            if (claudeEvent is ClaudeToolUse tool)
                _log($"  {tool.Describe()}");
            lock (reports)
                reports.Add(_reporter.ProgressAsync(run.RequestId, info));
        });
        // 095: the Codex engine — the request's pictures and every base64 file go with -i, a thread continues.
        if (run.IsCodex)
        {
            var images = new List<string>();
            for (var i = 0; i < run.Images.Count; i++)
            {
                var relative = AttachmentPath(run.RequestId, i + 1);
                try
                {
                    FileWriter.WriteBytes(root, relative, run.Images[i].Png);
                    images.Add(FileWriter.Resolve(root, relative)!);
                }
                catch (FormatException)
                {
                    _log($"Imagem inválida no pedido #{run.RequestId}; ignorada.");
                }
            }
            images.AddRange(run.Files.Where(f => f.IsBase64).Select(f => FileWriter.Resolve(root, f.Path)!));
            var codexArguments = CodexRunner.Arguments(_settings, run.Resume, images);
            var codexOutcome = await _codex.RunAsync(codexArguments, run.Prompt, progress, cancellation);
            return await AfterRunAsync(codexOutcome, reports, cancellation, afterRun);
        }

        // 094: the run's tools live on a local MCP server for as long as the Claude runs (never on a read-only run).
        await using var tools = run.Tools.Count > 0
            ? await _toolHosts.StartAsync(run.Tools, (call, ct) => CallToolAsync(run.RequestId, call, watcher, reports, ct), cancellation)
            : null;
        var arguments = ClaudeRunner.Arguments(_settings, run.SessionId, run.Started, run.SystemPrompt, run.ReadOnly, tools);
        var outcome = await _claude.RunAsync(arguments, PromptMessage.Build(run.Prompt, run.Images), progress, cancellation);
        return await AfterRunAsync(outcome, reports, cancellation, afterRun);
    }

    /// <summary>The last write may settle after the result line: the watcher keeps going a while, then every report is awaited.</summary>
    private static async Task<RequestOutcomeInfo> AfterRunAsync(ClaudeOutcome outcome, List<Task> reports, CancellationToken cancellation, TimeSpan afterRun)
    {
        if (outcome.Kind != ClaudeOutcomeKind.Stopped && afterRun > TimeSpan.Zero)
            await Task.Delay(afterRun, CancellationToken.None);
        Task[] pending;
        lock (reports)
            pending = reports.ToArray();
        await Task.WhenAll(pending);
        return outcome.ToInfo();
    }

    /// <summary>
    /// A tool call of the Claude (094): first every pending file change is reported (and its sending awaited), so the
    /// server already has the edit the Claude just made; then the call goes to the server and its answer comes back.
    /// </summary>
    private async Task<ToolResultInfo> CallToolAsync(long requestId, ToolCallInfo call, FileWatcher watcher, List<Task> reports, CancellationToken cancellation)
    {
        _log($"Pedido #{requestId}: ferramenta {call.Name}…");
        watcher.Flush();
        Task[] pending;
        lock (reports)
            pending = reports.ToArray();
        await Task.WhenAll(pending);
        return await _reporter.CallToolAsync(requestId, call, cancellation);
    }

    /// <summary>The console's events as the hub takes them; permission denials come as notices at the end.</summary>
    public static ClaudeEventInfo? ToInfo(ClaudeEvent claudeEvent) => claudeEvent switch
    {
        ClaudeStarted => new ClaudeEventInfo { Kind = ClaudeEventInfo.STARTED },
        // 095: the Codex thread id goes back so the server can resume the conversation.
        CodexStarted codex => new ClaudeEventInfo { Kind = ClaudeEventInfo.STARTED, Text = codex.ThreadId },
        ClaudeTextDelta delta => new ClaudeEventInfo { Kind = ClaudeEventInfo.TEXT, Text = delta.Text },
        ClaudeToolUse tool => new ClaudeEventInfo { Kind = ClaudeEventInfo.TOOL, Tool = tool.Tool, Target = tool.Target, Text = tool.Describe() },
        ClaudeFinished { PermissionDenials.Count: > 0 } finished => new ClaudeEventInfo
        {
            Kind = ClaudeEventInfo.NOTICE,
            Text = $"Ferramentas sem permissão: {string.Join(", ", finished.PermissionDenials)}.",
        },
        _ => null,
    };
}
