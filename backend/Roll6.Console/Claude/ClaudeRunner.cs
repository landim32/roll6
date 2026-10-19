using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Roll6.Console.Settings;
using Roll6.Console.Tools;
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

    /// <summary>
    /// Removed from the Claude's environment: the variables that would make the CLI use an API key or another provider
    /// instead of the account, and (093) the console's own Roll6 credentials — the Claude never needs them.
    /// </summary>
    public static readonly string[] REMOVED_VARIABLES =
    {
        "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX",
        ConsoleSettings.API_KEY_VARIABLE, ConsoleSettings.URL_VARIABLE,
    };

    /// <summary>The only tools of a read-only run (093): read, find, search and the skills.</summary>
    public const string READ_ONLY_TOOLS = "Read,Glob,Grep,Skill";

    /// <summary>
    /// Pre-approved in a read-only run: only the skills. Reading is NOT pre-approved on purpose — inside the working
    /// directory Claude Code reads without asking, and anything outside it would need a permission that "dontAsk" denies
    /// (a blanket "Read" would let a question read any file of the machine; verified with Claude Code 2.1.301).
    /// </summary>
    public const string READ_ONLY_ALLOWED = "Skill";

    /// <summary>Refused by name in a read-only run, on top of not being available at all.</summary>
    public const string READ_ONLY_DENIED = "Bash,Write,Edit,MultiEdit,NotebookEdit,WebFetch,WebSearch,Task,TodoWrite";

    /// <summary>No MCP server at all in a read-only run (not the machine's, not the project's — e.g. the Roll6 one with a key).</summary>
    public const string NO_MCP = "{\"mcpServers\":{}}";

    /// <summary>The inline <c>--mcp-config</c> of a run's tool server (094): HTTP on loopback, the run's token as a bearer header.</summary>
    public static string ToolsMcpConfig(IToolHost tools) => JsonSerializer.Serialize(new Dictionary<string, object>
    {
        ["mcpServers"] = new Dictionary<string, object>
        {
            [LocalToolServer.SERVER_NAME] = new Dictionary<string, object>
            {
                ["type"] = "http",
                ["url"] = tools.Url,
                ["headers"] = new Dictionary<string, string> { ["Authorization"] = $"Bearer {tools.Token}" },
            },
        },
    });

    /// <summary>The configured allowed tools plus "mcp__roll6-editor__{name}" for each tool of the run.</summary>
    public static string AllowedWithTools(string allowed, IToolHost? tools)
    {
        if (tools is not { ToolNames.Count: > 0 })
            return allowed;
        var names = tools.ToolNames.Select(name => $"mcp__{LocalToolServer.SERVER_NAME}__{name}");
        return string.IsNullOrWhiteSpace(allowed) ? string.Join(",", names) : $"{allowed},{string.Join(",", names)}";
    }

    private static readonly string[] LOGIN_HINTS = { "login", "log in", "auth", "401", "credential" };

    private readonly ConsoleSettings _settings;

    public ClaudeRunner(ConsoleSettings settings)
    {
        _settings = settings;
    }

    /// <summary>
    /// The arguments for <c>ProcessStartInfo.ArgumentList</c>: the first request of a conversation creates the session
    /// with its id, the next ones resume it; the system prompt comes whole from the server.
    /// <para>
    /// A read-only run (093, a question of a player) is locked down here, whatever the server sent: only the tools of
    /// <see cref="READ_ONLY_TOOLS"/> exist, the dangerous ones are also refused by name, nothing prompts (anything not
    /// allowed is denied), no MCP server is loaded, a fresh session is never resumed nor kept.
    /// </para>
    /// </summary>
    /// <para>
    /// 094: with <paramref name="tools"/> (a run that offers tools, never a read-only one) the Claude also gets the run's
    /// local MCP server through <c>--mcp-config</c> (its token in the header) and each tool pre-approved by name.
    /// </para>
    public static List<string> Arguments(ConsoleSettings settings, Guid sessionId, bool started, string systemPrompt, bool readOnly = false,
        IToolHost? tools = null)
    {
        var arguments = new List<string>
        {
            "-p",
            "--input-format", "stream-json",
            "--output-format", "stream-json",
            "--verbose",
            "--include-partial-messages",
        };
        if (readOnly)
        {
            arguments.AddRange(new[]
            {
                "--session-id", sessionId.ToString(),
                "--no-session-persistence",
                "--tools", READ_ONLY_TOOLS,
                "--allowedTools", READ_ONLY_ALLOWED,
                "--disallowedTools", READ_ONLY_DENIED,
                "--permission-mode", "dontAsk",
                "--permission-prompts", "none",
                "--strict-mcp-config",
                "--mcp-config", NO_MCP,
            });
        }
        else
        {
            arguments.AddRange(new[]
            {
                started ? "--resume" : "--session-id", sessionId.ToString(),
                "--permission-mode", "acceptEdits",
                "--allowedTools", AllowedWithTools(settings.ClaudeAllowedTools, tools),
            });
            if (tools is { ToolNames.Count: > 0 })
            {
                arguments.Add("--mcp-config");
                arguments.Add(ToolsMcpConfig(tools));
            }
        }
        arguments.Add("--append-system-prompt");
        arguments.Add(systemPrompt);
        return arguments;
    }

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
