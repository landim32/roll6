namespace Roll6Anime.Core.Claude;

/// <summary>What the conversation shows while the local Claude works (062, data-model.md, contracts/claude-cli.md).</summary>
public abstract record ClaudeEvent;

/// <summary>The session started. <paramref name="UsesAccount"/>: the CLI is on the user's login, not on an API key.</summary>
public sealed record ClaudeStarted(Guid SessionId, bool UsesAccount) : ClaudeEvent;

/// <summary>A piece of the answer, as it is written.</summary>
public sealed record ClaudeTextDelta(string Text) : ClaudeEvent;

/// <summary>A tool the Claude uses: reading, editing, running the validator.</summary>
public sealed record ClaudeToolUse(string Tool, string? Target) : ClaudeEvent
{
    /// <summary>A short Portuguese line for the conversation ("Editando animacoes/aceno.json").</summary>
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

/// <summary>The request ended: the CLI's own result line.</summary>
public sealed record ClaudeFinished(bool IsError, string? Result, IReadOnlyList<string> PermissionDenials) : ClaudeEvent;
