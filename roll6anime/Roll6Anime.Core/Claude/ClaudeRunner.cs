using System.ComponentModel;
using System.Diagnostics;
using System.Text;
using Roll6Anime.Core.Settings;

namespace Roll6Anime.Core.Claude;

/// <summary>How a request ended.</summary>
public enum ClaudeOutcomeKind
{
    Done,
    Stopped,
    Failed,
}

/// <summary>How a request ended, with the Portuguese reason of a failure (FR-014).</summary>
public record ClaudeOutcome(ClaudeOutcomeKind Kind, string? Message = null, IReadOnlyList<string>? PermissionDenials = null)
{
    public static readonly ClaudeOutcome STOPPED = new(ClaudeOutcomeKind.Stopped, "Pedido parado.");
}

/// <summary>
/// Runs one request on the local Claude Code (062, research R6, contracts/claude-cli.md): the CLI in the configured
/// working directory, the prompt through stdin, the stream-json output read line by line. The variables that would
/// put the CLI on an API key are removed, so it uses the user's own login. One process per request; the conversation's
/// session id carries the memory.
/// </summary>
public static class ClaudeRunner
{
    public const string NOT_FOUND = "O Claude Code não foi encontrado. Instale-o ou ajuste Roll6Anime:ClaudeExecutable em appsettings.json.";
    public const string NOT_LOGGED_IN = "O Claude Code não está logado. Abra um terminal, rode `claude` e faça login com a sua conta.";

    /// <summary>The variables that would make the CLI use an API key or another provider instead of the account.</summary>
    public static readonly string[] REMOVED_VARIABLES =
        { "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX" };

    private static readonly string[] LOGIN_HINTS = { "login", "log in", "auth", "401", "credential" };

    public static async Task<ClaudeOutcome> RunAsync(
        AnimeSettings settings, Conversation conversation, string context, string prompt,
        IProgress<ClaudeEvent> progress, CancellationToken cancellation)
    {
        if (settings.CheckClaudeWorkingDirectory() is { } missing)
            return new ClaudeOutcome(ClaudeOutcomeKind.Failed, missing);

        var start = new ProcessStartInfo(settings.ClaudeExecutable)
        {
            WorkingDirectory = settings.ClaudeWorkingDirectory,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardInputEncoding = new UTF8Encoding(false),
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        foreach (var argument in PromptContext.ClaudeArguments(settings, conversation, context))
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
                await process.StandardInput.WriteAsync(prompt);
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
                    if (claudeEvent is ClaudeStarted)
                        conversation.Started = true;
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
