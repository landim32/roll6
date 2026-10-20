using System.Text.Json;
using Roll6.Console.Claude;

namespace Roll6.Console.Codex;

/// <summary>
/// Reads the JSONL of <c>codex exec --json</c> (095, contracts/console-engine.md; verified with codex-cli 0.161.0) as the
/// same events the Claude runner reports: <c>thread.started</c> → started (the thread id, kept by the server to resume),
/// a finished agent message → text, a shell command → tool, <c>turn.completed</c> → done, <c>turn.failed</c>/<c>error</c>
/// → failed. Unknown lines are skipped.
/// </summary>
public static class CodexEventReader
{
    public const int MAX_COMMAND = 200;

    public static IEnumerable<ClaudeEvent> ReadLine(string? line)
    {
        if (string.IsNullOrWhiteSpace(line) || !line.TrimStart().StartsWith('{'))
            yield break;
        JsonElement root;
        try
        {
            using var document = JsonDocument.Parse(line);
            root = document.RootElement.Clone();
        }
        catch (JsonException)
        {
            yield break;
        }
        var type = Text(root, "type");
        switch (type)
        {
            case "thread.started":
                if (Text(root, "thread_id") is { } thread)
                    yield return new CodexStarted(thread);
                break;
            case "item.started" or "item.completed":
                if (!root.TryGetProperty("item", out var item) || item.ValueKind != JsonValueKind.Object)
                    break;
                var kind = Text(item, "type");
                if (type == "item.completed" && kind == "agent_message" && Text(item, "text") is { Length: > 0 } message)
                {
                    yield return new ClaudeTextDelta(message.TrimEnd() + "\n\n");
                    // 097: the whole message for the console's log.
                    yield return new ClaudeText(message.TrimEnd());
                }
                else if (type == "item.started" && kind == "command_execution")
                    yield return new ClaudeToolUse("Shell", Cut(Text(item, "command")), Text(item, "command"));
                break;
            case "turn.completed":
                yield return new ClaudeFinished(false, null, Array.Empty<string>());
                break;
            case "turn.failed":
                yield return new ClaudeFinished(true, ErrorOf(root) ?? "O Codex não concluiu o pedido.", Array.Empty<string>());
                break;
            case "error":
                yield return new ClaudeFinished(true, Text(root, "message") ?? ErrorOf(root) ?? "Erro do Codex.", Array.Empty<string>());
                break;
        }
    }

    private static string? ErrorOf(JsonElement root) =>
        root.TryGetProperty("error", out var error)
            ? error.ValueKind == JsonValueKind.String ? error.GetString() : Text(error, "message")
            : null;

    private static string? Text(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private static string? Cut(string? command) =>
        command == null ? null : command.Length <= MAX_COMMAND ? command : command[..MAX_COMMAND] + "…";
}

/// <summary>The Codex thread started (its id is what <c>codex exec … resume</c> continues).</summary>
public sealed record CodexStarted(string ThreadId) : ClaudeEvent;
