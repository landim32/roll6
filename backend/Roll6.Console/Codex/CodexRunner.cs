using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using Roll6.Console.Claude;
using Roll6.Console.Settings;

namespace Roll6.Console.Codex;

/// <summary>
/// Runs one request on the local Codex CLI (095, contracts/console-engine.md): <c>codex exec --json</c> in the working
/// directory with the workspace-write sandbox, the prompt on stdin, the request's images with <c>-i</c>, and — when the
/// server sends a thread — <c>resume</c> of that conversation. The JSONL is read by <see cref="CodexEventReader"/>.
/// Like the Claude runner, it never learns what the request is about.
/// </summary>
public sealed class CodexRunner : IClaudeProcess
{
    public const string NOT_FOUND = "O Codex não foi encontrado. Instale-o (npm i -g @openai/codex) ou ajuste Roll6Console:CodexExecutable em appsettings.json.";
    public const string NOT_LOGGED_IN = "O Codex não está logado. Abra um terminal, rode `codex login` e entre com a sua conta.";

    /// <summary>Removed from the Codex environment: the console's own Roll6 credentials.</summary>
    public static readonly string[] REMOVED_VARIABLES = { ConsoleSettings.API_KEY_VARIABLE, ConsoleSettings.URL_VARIABLE };

    private static readonly string[] LOGIN_HINTS = { "login", "log in", "not logged", "unauthorized", "401", "authentication" };

    private readonly ConsoleSettings _settings;

    public CodexRunner(ConsoleSettings settings)
    {
        _settings = settings;
    }

    /// <summary>
    /// The arguments for <c>ProcessStartInfo.ArgumentList</c>. The exec-level options (<c>-s</c>, <c>-C</c>) go before
    /// <c>resume</c>, which does not accept them (verified with 0.161.0); <c>-</c> reads the prompt from stdin.
    /// </summary>
    public static List<string> Arguments(ConsoleSettings settings, string? resume, IReadOnlyList<string> images, string? reminder = null)
    {
        var arguments = new List<string> { "exec", "-s", "workspace-write", "-C", settings.ClaudeWorkingDirectory, "--skip-git-repo-check" };
        if (!string.IsNullOrWhiteSpace(reminder))
        {
            arguments.Add("-c");
            arguments.Add($"developer_instructions=\"{reminder.Replace("\\", "\\\\").Replace("\"", "\\\"")}\"");
        }
        if (!string.IsNullOrWhiteSpace(resume))
        {
            arguments.Add("resume");
            arguments.Add(resume);
        }
        arguments.Add("--json");
        foreach (var image in images)
        {
            arguments.Add("-i");
            arguments.Add(image);
        }
        arguments.Add("-");
        return arguments;
    }

    /// <summary>
    /// The CLI to start: a path as configured, or the name looked up in the PATH as .exe, then .cmd/.bat (npm installs
    /// Codex as "codex.cmd" on Windows, which <c>UseShellExecute = false</c> does not find by its bare name).
    /// </summary>
    public static string Resolve(string executable, Func<string, string?>? variable = null, Func<string, bool>? exists = null)
    {
        if (string.IsNullOrWhiteSpace(executable) || !OperatingSystem.IsWindows() || Path.HasExtension(executable)
            || executable.Contains(Path.DirectorySeparatorChar) || executable.Contains(Path.AltDirectorySeparatorChar))
            return executable;
        variable ??= Environment.GetEnvironmentVariable;
        exists ??= File.Exists;
        foreach (var folder in (variable("PATH") ?? string.Empty).Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
            foreach (var extension in new[] { ".exe", ".cmd", ".bat" })
            {
                var candidate = Path.Combine(folder.Trim(), executable + extension);
                if (exists(candidate))
                    return candidate;
            }
        return executable;
    }

    public async Task<ClaudeOutcome> RunAsync(IReadOnlyList<string> arguments, string stdin, IProgress<ClaudeEvent> progress, CancellationToken cancellation)
    {
        if (_settings.CheckClaudeWorkingDirectory() is { } missing)
            return new ClaudeOutcome(ClaudeOutcomeKind.Failed, missing);
        var start = new ProcessStartInfo(Resolve(_settings.CodexExecutable))
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
                // Ended before reading the prompt: its output says why.
            }

            while (await process.StandardOutput.ReadLineAsync(CancellationToken.None) is { } line)
            {
                foreach (var codexEvent in CodexEventReader.ReadLine(line))
                {
                    if (codexEvent is ClaudeFinished end)
                        finished = end;
                    progress.Report(codexEvent);
                }
            }
            await process.WaitForExitAsync(CancellationToken.None);
        }
        catch (IOException) when (cancellation.IsCancellationRequested)
        {
            // Killed.
        }

        if (cancellation.IsCancellationRequested)
            return ClaudeOutcome.STOPPED;
        var errorText = await stderr;
        if (finished is { IsError: false })
            return new ClaudeOutcome(ClaudeOutcomeKind.Done);
        var reason = finished?.Result ?? errorText;
        if (LOGIN_HINTS.Any(hint => reason.Contains(hint, StringComparison.OrdinalIgnoreCase)))
            return new ClaudeOutcome(ClaudeOutcomeKind.Failed, NOT_LOGGED_IN);
        var tail = reason.Trim();
        if (tail.Length > 500)
            tail = "…" + tail[^500..];
        return new ClaudeOutcome(ClaudeOutcomeKind.Failed, string.IsNullOrWhiteSpace(tail) ? $"O Codex terminou com o código {process.ExitCode}." : tail);
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
