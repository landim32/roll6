using System.Text.Json;

namespace Roll6.Console.Claude;

/// <summary>
/// Reads the Claude Code's <c>--output-format stream-json</c> output, one line at a time (062, contracts/claude-cli.md;
/// the real output this follows is <c>specs/062-roll6anime-editor/contracts/samples/claude-ok.jsonl</c>). Anything it
/// does not use is ignored.
/// </summary>
public static class StreamJsonReader
{
    /// <summary>The events of one line: none for lines it ignores, one per tool for an assistant message.</summary>
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
                // The text came already as deltas: only the tools are taken from the whole message.
                if (!root.TryGetProperty("message", out var message) || !message.TryGetProperty("content", out var content)
                    || content.ValueKind != JsonValueKind.Array)
                    return Array.Empty<ClaudeEvent>();
                return content.EnumerateArray()
                    .Where(item => Text(item, "type") == "tool_use")
                    .Select(item => (ClaudeEvent)new ClaudeToolUse(Text(item, "name") ?? "?", TargetOf(item)))
                    .ToList();

            case "result":
                var denials = root.TryGetProperty("permission_denials", out var list) && list.ValueKind == JsonValueKind.Array
                    ? list.EnumerateArray().Select(item => Text(item, "tool_name") ?? "?").ToList()
                    : new List<string>();
                var isError = root.TryGetProperty("is_error", out var error) && error.ValueKind == JsonValueKind.True;
                return new ClaudeEvent[] { new ClaudeFinished(isError, Text(root, "result"), denials) };

            default:
                return Array.Empty<ClaudeEvent>();
        }
    }

    private static string? TargetOf(JsonElement toolUse)
    {
        if (!toolUse.TryGetProperty("input", out var input) || input.ValueKind != JsonValueKind.Object)
            return null;
        return Text(input, "file_path") ?? Text(input, "command") ?? Text(input, "pattern") ?? Text(input, "skill") ?? Text(input, "path");
    }

    private static string? Text(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
