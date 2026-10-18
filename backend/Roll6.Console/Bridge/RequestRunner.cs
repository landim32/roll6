using Roll6.Console.Claude;
using Roll6.Console.Files;
using Roll6.Console.Settings;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Console.Bridge;

/// <summary>What the runner reports back to the server (the hub, or a fake in tests).</summary>
public interface IRequestReporter
{
    Task ProgressAsync(long requestId, ClaudeEventInfo claudeEvent);
    Task FileChangedAsync(long requestId, FileChangedInfo info);
    Task FinishedAsync(long requestId, RequestOutcomeInfo outcome);
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
    private readonly object _lock = new();
    private long? _running;
    private CancellationTokenSource? _cancellation;

    public RequestRunner(ConsoleSettings settings, IClaudeProcess claude, IRequestReporter reporter, Action<string>? log = null)
    {
        _settings = settings;
        _claude = claude;
        _reporter = reporter;
        _log = log ?? (_ => { });
    }

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
            _log($"Pedido #{run.RequestId}: rodando o Claude…");
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
                if (FileWriter.Write(_settings.ClaudeWorkingDirectory, file.Path, file.Content))
                    _log($"Arquivo gravado: {file.Path}");
            }
            catch (IOException ex)
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
        if (run.Files.Any(f => FileWriter.Resolve(root, f.Path) == null) || run.Watch.Any(w => FileWriter.Resolve(root, w.TrimEnd('/', '\\')) == null))
            return new RequestOutcomeInfo { Kind = RequestOutcomeInfo.FAILED, Message = FileWriter.OUTSIDE };

        using var watcher = new FileWatcher(root, run.Watch);
        var reports = new List<Task>();
        watcher.FileSettled += (path, content) =>
        {
            _log($"Arquivo alterado: {path}");
            lock (reports)
                reports.Add(_reporter.FileChangedAsync(run.RequestId, new FileChangedInfo { Path = path, Content = content }));
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
        var arguments = ClaudeRunner.Arguments(_settings, run.SessionId, run.Started, run.SystemPrompt);
        var outcome = await _claude.RunAsync(arguments, PromptMessage.Build(run.Prompt, run.Images), progress, cancellation);

        // The last write of the Claude may settle after its result line.
        if (outcome.Kind != ClaudeOutcomeKind.Stopped && afterRun > TimeSpan.Zero)
            await Task.Delay(afterRun, CancellationToken.None);
        Task[] pending;
        lock (reports)
            pending = reports.ToArray();
        await Task.WhenAll(pending);
        return outcome.ToInfo();
    }

    /// <summary>The console's events as the hub takes them; permission denials come as notices at the end.</summary>
    public static ClaudeEventInfo? ToInfo(ClaudeEvent claudeEvent) => claudeEvent switch
    {
        ClaudeStarted => new ClaudeEventInfo { Kind = ClaudeEventInfo.STARTED },
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
