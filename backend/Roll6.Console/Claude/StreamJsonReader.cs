using System.Text.Json;
using Roll6.Console.Bridge;

namespace Roll6.Console.Claude;

/// <summary>
/// Reads the Claude Code's <c>--output-format stream-json</c> output, one line at a time (062, contracts/claude-cli.md;
/// the real output this follows is <c>specs/062-roll6anime-editor/contracts/samples/claude-ok.jsonl</c>). Since 097 it
/// also keeps, for the console's own log, the whole input of each tool, each tool's result and the complete texts of
/// the assistant; the server still receives only what it received before. Anything else is ignored.
/// </summary>
public static class StreamJsonReader
{
    /// <summary>The events of one line: none for lines it ignores, one per tool/text for an assistant message, one per result for a user message.</summary>
    public static IReadOnlyList<ClaudeEvent> ReadLine(string? line)
    {
        if (string.IsNullOrWhiteSpace(line) || line.TrimStart()[0] != '{')
            return Array.Empty<ClaudeEvent>();
        try
        {
            using var document = JsonDocument.Parse(line);
            return Read(document.RootElement);
        }
        catch (JsonException)
        {
            return Array.Empty<ClaudeEvent>();
        }
    }

    private static IReadOnlyList<ClaudeEvent> Read(JsonElement root)
    {
        switch (Text(root, "type"))
        {
            case "system" when Text(root, "subtype") == "init":
                return Guid.TryParse(Text(root, "session_id"), out var session)
                    ? new ClaudeEvent[] { new ClaudeStarted(session, Text(root, "apiKeySource") is null or "none") }
                    : Array.Empty<ClaudeEvent>();

            case "stream_event":
                if (root.TryGetProperty("event", out var streamEvent)
                    && Text(streamEvent, "type") == "content_block_delta"
                    && streamEvent.TryGetProperty("delta", out var delta)
                    && Text(delta, "type") == "text_delta"
                    && Text(delta, "text") is { Length: > 0 } text)
                    return new ClaudeEvent[] { new ClaudeTextDelta(text) };
                return Array.Empty<ClaudeEvent>();

            case "assistant":
                // The text came already as deltas (relayed); the whole blocks and the tools' inputs are for the log.
                return Content(root)
                    .Select(item => Text(item, "type") switch
                    {
                        "tool_use" => new ClaudeToolUse(Text(item, "name") ?? "?", TargetOf(item), InputOf(item)),
                        "text" when Text(item, "text") is { } block && block.Trim().Length > 0 => new ClaudeText(block),
                        _ => (ClaudeEvent?)null,
                    })
                    .Where(e => e != null)
                    .Select(e => e!)
                    .ToList();

            case "user":
                // 097: the tools' results (the Claude's own turn carries them back as a user message).
                return Content(root)
                    .Where(item => Text(item, "type") == "tool_result")
                    .Select(item => (ClaudeEvent)new ClaudeToolResult(Text(item, "tool_use_id"), LogLines.Head(ResultText(item)),
                        item.TryGetProperty("is_error", out var error) && error.ValueKind == JsonValueKind.True))
                    .ToList();

            case "result":
                var denials = root.TryGetProperty("permission_denials", out var list) && list.ValueKind == JsonValueKind.Array
                    ? list.EnumerateArray().Select(item => Text(item, "tool_name") ?? "?").ToList()
                    : new List<string>();
                var isError = root.TryGetProperty("is_error", out var err) && err.ValueKind == JsonValueKind.True;
                return new ClaudeEvent[] { new ClaudeFinished(isError, Text(root, "result"), denials) };

            default:
                return Array.Empty<ClaudeEvent>();
        }
    }

    private static IEnumerable<JsonElement> Content(JsonElement root) =>
        root.TryGetProperty("message", out var message) && message.TryGetProperty("content", out var content)
        && content.ValueKind == JsonValueKind.Array
            ? content.EnumerateArray()
            : Enumerable.Empty<JsonElement>();

    private static string? TargetOf(JsonElement toolUse)
    {
        if (!toolUse.TryGetProperty("input", out var input) || input.ValueKind != JsonValueKind.Object)
            return null;
        return Text(input, "file_path") ?? Text(input, "command") ?? Text(input, "pattern") ?? Text(input, "skill") ?? Text(input, "path");
    }

    private static string? InputOf(JsonElement toolUse) =>
        toolUse.TryGetProperty("input", out var input) && input.ValueKind == JsonValueKind.Object ? LogLines.Compact(input) : null;

    /// <summary>A result's content: a string, or the text items of an array joined.</summary>
    private static string ResultText(JsonElement result)
    {
        if (!result.TryGetProperty("content", out var content))
            return string.Empty;
        if (content.ValueKind == JsonValueKind.String)
            return content.GetString() ?? string.Empty;
        if (content.ValueKind == JsonValueKind.Array)
            return string.Join("\n", content.EnumerateArray().Select(item => Text(item, "text")).Where(t => t != null));
        return string.Empty;
    }

    private static string? Text(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
