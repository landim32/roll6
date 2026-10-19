using System.Text.Json.Serialization;

namespace Roll6.DTO.Realtime.Console;

/// <summary>A picture attached to a request: a PNG (base64, no <c>data:</c> prefix) and the text that says what it shows.</summary>
public class PromptImageInfo
{
    [JsonPropertyName("png")]
    public string Png { get; set; } = string.Empty;

    [JsonPropertyName("caption")]
    public string Caption { get; set; } = string.Empty;
}

/// <summary>A file the console writes inside its working directory (<c>run.files[]</c> and client method <c>writeFiles</c>).</summary>
public class FileWriteInfo
{
    /// <summary>Relative to the working directory, forward slashes ("animacoes/7-aceno.json").</summary>
    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>095: "text" (default) or "base64" — the console writes the decoded bytes.</summary>
    [JsonPropertyName("encoding")]
    public string? Encoding { get; set; }

    public bool IsBase64 => string.Equals(Encoding, FileEncodings.BASE64, StringComparison.OrdinalIgnoreCase);
}

/// <summary>How a file's content travels (095): plain text, or the bytes in base64 (images).</summary>
public static class FileEncodings
{
    public const string TEXT = "text";
    public const string BASE64 = "base64";
}

/// <summary>A watched file that changed (hub method <c>FileChanged</c>): its relative path and its whole text.</summary>
public class FileChangedInfo
{
    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>095: "text" or "base64" (image files are reported as their bytes in base64).</summary>
    [JsonPropertyName("encoding")]
    public string? Encoding { get; set; }

    public bool IsBase64 => string.Equals(Encoding, FileEncodings.BASE64, StringComparison.OrdinalIgnoreCase);
}

/// <summary>
/// One request for the local Claude Code (086, client method <c>run</c>). Generic by design: the server builds it — the
/// instructions, the user text, the pictures, the Claude session to create or resume, the files to write before the run
/// and the paths to watch while it runs — and the console only executes it and reports what came out.
/// </summary>
public class RunInfo
{
    [JsonPropertyName("requestId")]
    public long RequestId { get; set; }

    /// <summary>The Claude session: created with <c>--session-id</c> on the first request, resumed afterwards.</summary>
    [JsonPropertyName("sessionId")]
    public Guid SessionId { get; set; }

    /// <summary>The session already exists on the machine (resume it).</summary>
    [JsonPropertyName("started")]
    public bool Started { get; set; }

    /// <summary>Appended to the Claude Code system prompt (<c>--append-system-prompt</c>).</summary>
    [JsonPropertyName("systemPrompt")]
    public string SystemPrompt { get; set; } = string.Empty;

    [JsonPropertyName("prompt")]
    public string Prompt { get; set; } = string.Empty;

    [JsonPropertyName("images")]
    public List<PromptImageInfo> Images { get; set; } = new();

    /// <summary>Written (temp + move) before the Claude starts; unchanged text is left alone.</summary>
    [JsonPropertyName("files")]
    public List<FileWriteInfo> Files { get; set; } = new();

    /// <summary>Relative paths (files, or folders ending in "/") whose changes are reported as <c>FileChanged</c>.</summary>
    [JsonPropertyName("watch")]
    public List<string> Watch { get; set; } = new();

    /// <summary>
    /// A read-only run (093): the console lets the Claude only read files of its working directory (no write, exec,
    /// network or MCP), never resumes a session, scrubs its secrets from the environment and ignores
    /// <see cref="Files"/>/<see cref="Watch"/> — whatever the rest of the request says.
    /// </summary>
    [JsonPropertyName("readOnly")]
    public bool ReadOnly { get; set; }

    public const string ENGINE_CLAUDE = "claude";
    public const string ENGINE_CODEX = "codex";

    /// <summary>
    /// 095: which CLI runs the request — "claude" (default, 086) or "codex" (the map generator). Read-only runs are
    /// always Claude.
    /// </summary>
    [JsonPropertyName("engine")]
    public string? Engine { get; set; }

    /// <summary>095: the engine's own session to continue (the Codex thread id); null = a new one.</summary>
    [JsonPropertyName("resume")]
    public string? Resume { get; set; }

    public bool IsCodex => !ReadOnly && string.Equals(Engine, ENGINE_CODEX, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Tools offered to the Claude in this run (094): exposed by the console on a local MCP server for the run and
    /// forwarded as <c>ToolCall</c>. Empty = none; ignored on a read-only run.
    /// </summary>
    [JsonPropertyName("tools")]
    public List<ToolInfo> Tools { get; set; } = new();
}

/// <summary>One event of a running request (hub method <c>Progress</c>, client method <c>requestProgress</c>).</summary>
public class ClaudeEventInfo
{
    public const string STARTED = "started";
    public const string TEXT = "text";
    public const string TOOL = "tool";
    public const string NOTICE = "notice";

    /// <summary>"started" (the session exists), "text" (a piece of the answer), "tool" (a tool in use), "notice" (a line of the console or the server).</summary>
    [JsonPropertyName("kind")]
    public string Kind { get; set; } = TEXT;

    /// <summary>The text delta, or the text of the notice.</summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>The tool name ("Edit", "Bash"…).</summary>
    [JsonPropertyName("tool")]
    public string? Tool { get; set; }

    /// <summary>What the tool touched (a path, a command).</summary>
    [JsonPropertyName("target")]
    public string? Target { get; set; }
}

/// <summary>How a request ended (hub method <c>Finished</c>).</summary>
public class RequestOutcomeInfo
{
    public const string DONE = "done";
    public const string STOPPED = "stopped";
    public const string FAILED = "failed";

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = DONE;

    /// <summary>The Portuguese reason of a failure or a stop.</summary>
    [JsonPropertyName("message")]
    public string? Message { get; set; }

    /// <summary>Tools the Claude asked for and was refused.</summary>
    [JsonPropertyName("permissionDenials")]
    public List<string> PermissionDenials { get; set; } = new();
}
