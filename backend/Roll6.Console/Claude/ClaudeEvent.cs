namespace Roll6.Console.Claude;

/// <summary>What the Claude Code reports while it works (086; from roll6anime 062, contracts/claude-cli.md).</summary>
public abstract record ClaudeEvent;

/// <summary>The session started. <paramref name="UsesAccount"/>: the CLI is on the user's login, not on an API key.</summary>
public sealed record ClaudeStarted(Guid SessionId, bool UsesAccount) : ClaudeEvent;

/// <summary>A piece of the answer, as it is written.</summary>
public sealed record ClaudeTextDelta(string Text) : ClaudeEvent;

/// <summary>
/// A tool the Claude uses: reading, editing, running a command. <paramref name="Target"/> is the one string the
/// server's relay shows; <paramref name="Input"/> (097) is the whole input, compacted, for the console's own log.
/// </summary>
public sealed record ClaudeToolUse(string Tool, string? Target, string? Input = null) : ClaudeEvent
{
    /// <summary>A short Portuguese line for a conversation ("Editando animacoes/aceno.json").</summary>
    public string Describe()
    {
        var target = string.IsNullOrWhiteSpace(Target) ? string.Empty : $" {Target}";
        return Tool switch
        {
            "Read" or "Glob" or "Grep" or "LS" => $"Lendo{target}",
            "Edit" or "Write" or "MultiEdit" or "NotebookEdit" => $"Editando{target}",
            "Bash" or "PowerShell" => $"Executando{target}",
            "Skill" => $"Usando a skill{target}",
            _ => $"{Tool}{target}",
        };
    }
}

/// <summary>What a tool answered (097): the head of its result, for the console's log only — never relayed.</summary>
public sealed record ClaudeToolResult(string? ToolUseId, string Text, bool IsError) : ClaudeEvent;

/// <summary>A complete text block of an assistant message (097): the console's log shows it whole — never relayed (the deltas already were).</summary>
public sealed record ClaudeText(string Text) : ClaudeEvent;

/// <summary>The request ended: the CLI's own result line.</summary>
public sealed record ClaudeFinished(bool IsError, string? Result, IReadOnlyList<string> PermissionDenials) : ClaudeEvent;
