using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using Roll6.Console.Settings;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Console.Claude;

/// <summary>How a request ended.</summary>
public enum ClaudeOutcomeKind
{
    Done,
    Stopped,
    Failed,
}

/// <summary>How a request ended, with the Portuguese reason of a failure.</summary>
public record ClaudeOutcome(ClaudeOutcomeKind Kind, string? Message = null, IReadOnlyList<string>? PermissionDenials = null)
{
    public static readonly ClaudeOutcome STOPPED = new(ClaudeOutcomeKind.Stopped, "Pedido parado.");

    public RequestOutcomeInfo ToInfo() => new()
    {
        Kind = Kind switch
        {
            ClaudeOutcomeKind.Done => RequestOutcomeInfo.DONE,
            ClaudeOutcomeKind.Stopped => RequestOutcomeInfo.STOPPED,
            _ => RequestOutcomeInfo.FAILED,
        },
        Message = Message,
        PermissionDenials = PermissionDenials?.ToList() ?? new List<string>(),
    };
}

/// <summary>The Claude Code process, as the runner starts it (a fake one in tests).</summary>
public interface IClaudeProcess
{
    /// <summary>Runs the CLI with these arguments and this stdin text; events as they come; the outcome at the end.</summary>
    Task<ClaudeOutcome> RunAsync(IReadOnlyList<string> arguments, string stdin, IProgress<ClaudeEvent> progress, CancellationToken cancellation);
}

/// <summary>
/// Runs one request on the local Claude Code (086; from roll6anime 062, contracts/claude-cli.md): the CLI in the
/// configured working directory, the request through stdin as one stream-json user message (the text and the pictures),
/// the stream-json output read line by line. The variables that would put the CLI on an API key are removed, so it uses
/// the user's own login. One process per request; the session id the server sends carries the memory.
/// </summary>
public sealed class ClaudeRunner : IClaudeProcess
{
    public const string NOT_FOUND = "O Claude Code não foi encontrado. Instale-o ou ajuste Roll6Console:ClaudeExecutable em appsettings.json.";
    public const string NOT_LOGGED_IN = "O Claude Code não está logado. Abra um terminal, rode `claude` e faça login com a sua conta.";

    /// <summary>The variables that would make the CLI use an API key or another provider instead of the account.</summary>
    public static readonly string[] REMOVED_VARIABLES =
        { "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX" };

    private static readonly string[] LOGIN_HINTS = { "login", "log in", "auth", "401", "credential" };

    private readonly ConsoleSettings _settings;

    public ClaudeRunner(ConsoleSettings settings)
    {
        _settings = settings;
    }

    /// <summary>
    /// The arguments for <c>ProcessStartInfo.ArgumentList</c>: the first request of a conversation creates the session
    /// with its id, the next ones resume it; the system prompt comes whole from the server.
    /// </summary>
    public static List<string> Arguments(ConsoleSettings settings, Guid sessionId, bool started, string systemPrompt) => new()
    {
        "-p",
        "--input-format", "stream-json",
        "--output-format", "stream-json",
        "--verbose",
        "--include-partial-messages",
        started ? "--resume" : "--session-id", sessionId.ToString(),
        "--permission-mode", "acceptEdits",
        "--allowedTools", settings.ClaudeAllowedTools,
        "--append-system-prompt", systemPrompt,
    };

    public async Task<ClaudeOutcome> RunAsync(IReadOnlyList<string> arguments, string stdin, IProgress<ClaudeEvent> progress, CancellationToken cancellation)
    {
        if (_settings.CheckClaudeWorkingDirectory() is { } missing)
            return new ClaudeOutcome(ClaudeOutcomeKind.Failed, missing);

        var start = new ProcessStartInfo(_settings.ClaudeExecutable)
        {
            WorkingDirectory = _settings.ClaudeWorkingDirectory,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardInputEncoding = new UTF8Encoding(false),
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        foreach (var argument in arguments)
            start.ArgumentList.Add(argument);
        foreach (var variable in REMOVED_VARIABLES)
            start.Environment.Remove(variable);

        using var process = new Process { StartInfo = start };
        try
        {
            process.Start();
        }
        catch (Win32Exception)
        {
            return new ClaudeOutcome(ClaudeOutcomeKind.Failed, NOT_FOUND);
        }

        var stderr = process.StandardError.ReadToEndAsync(CancellationToken.None);
        ClaudeFinished? finished = null;
        using var stop = cancellation.Register(() => Kill(process));
        try
        {
            try
            {
                await process.StandardInput.WriteAsync(stdin);
                await process.StandardInput.FlushAsync();
                process.StandardInput.Close();
            }
            catch (IOException)
            {
                // The process ended before reading the prompt: its output says why.
            }

            while (await process.StandardOutput.ReadLineAsync(CancellationToken.None) is { } line)
            {
                foreach (var claudeEvent in StreamJsonReader.ReadLine(line))
                {
                    if (claudeEvent is ClaudeFinished end)
                        finished = end;
                    progress.Report(claudeEvent);
                }
            }
            await process.WaitForExitAsync(CancellationToken.None);
        }
        catch (IOException) when (cancellation.IsCancellationRequested)
        {
            // The pipe broke because the process was killed.
        }

        if (cancellation.IsCancellationRequested)
            return ClaudeOutcome.STOPPED;

        var errorText = await stderr;
        if (finished is { IsError: false })
            return new ClaudeOutcome(ClaudeOutcomeKind.Done, null, finished.PermissionDenials);
        var reason = finished?.Result ?? errorText;
        if (LOGIN_HINTS.Any(hint => reason.Contains(hint, StringComparison.OrdinalIgnoreCase)))
            return new ClaudeOutcome(ClaudeOutcomeKind.Failed, NOT_LOGGED_IN);
        var detail = string.IsNullOrWhiteSpace(reason) ? $"O Claude Code terminou com o código {process.ExitCode}." : reason.Trim();
        return new ClaudeOutcome(ClaudeOutcomeKind.Failed, detail, finished?.PermissionDenials);
    }

    private static void Kill(Process process)
    {
        try
        {
            if (!process.HasExited)
                process.Kill(entireProcessTree: true);
        }
        catch (Exception ex) when (ex is InvalidOperationException or Win32Exception)
        {
            // Already gone.
        }
    }
}
