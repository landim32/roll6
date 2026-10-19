using System.Text.Json;
using Roll6.Domain.Models;
using Roll6.Domain.Slugs;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Domain.Animations;

/// <summary>What a file the console reported is to an animation (086).</summary>
public enum FileChangeKind
{
    /// <summary>The working file of the animation: a new version to validate.</summary>
    Working,
    /// <summary>Another <c>.json</c> under the animations folder: the Claude created a file.</summary>
    OtherAnimation,
    /// <summary>Anything else.</summary>
    Ignored,
}

/// <summary>
/// Builds what the generic <c>Roll6.Console</c> executes for the animation editor (086): the working file of the
/// animation inside the console's working directory, the folder to watch, the system prompt and the prompt. Pure: the
/// hub feeds it and reads its answers; the console never learns what an animation is.
/// </summary>
public static class AnimationRequestBuilder
{
    /// <summary>The folder of the working files, relative to the console's working directory (the table project).</summary>
    public const string FOLDER = "animacoes";

    private const string SLUG_FALLBACK = "animacao";

    /// <summary>"animacoes/{id}-{slug}.json" — forward slashes, as the Claude sees it.</summary>
    public static string WorkingPath(long animationId, string? name) =>
        $"{FOLDER}/{animationId}-{Slug.From(name, SLUG_FALLBACK)}.json";

    public static string WorkingPath(Animation animation) => WorkingPath(animation.AnimationId, animation.Name);

    /// <summary>The <c>run</c> payload of one request.</summary>
    public static RunInfo Build(
        Animation animation, JsonElement content, AnimationConversation conversation, long requestId,
        string text, IReadOnlyList<PromptImageInfo> images, string? modelName, IReadOnlyList<string>? modelWeapons = null)
    {
        var path = WorkingPath(animation);
        return new RunInfo
        {
            RequestId = requestId,
            SessionId = conversation.ClaudeSessionId,
            Started = conversation.Started,
            SystemPrompt = AnimationPromptContext.Build(path, modelName, modelWeapons),
            Prompt = text,
            Images = images.ToList(),
            Files = new List<FileWriteInfo> { new() { Path = path, Content = Serialize(content) } },
            Watch = new List<string> { FOLDER + "/" },
            // 094: the Claude can look at what it wrote.
            Tools = new List<ToolInfo> { PrintRequest.ToolDefinition() },
        };
    }

    /// <summary>The content as the working file holds it: indented, LF line ends on every platform, accents kept, trailing newline.</summary>
    public static string Serialize(JsonElement content) => AnimationFormat.SerializeIndented(content).Replace("\r\n", "\n") + "\n";

    /// <summary>What a reported path is to the animation.</summary>
    public static FileChangeKind Classify(Animation animation, string? path)
    {
        var normalized = Normalize(path);
        if (normalized.Length == 0)
            return FileChangeKind.Ignored;
        if (string.Equals(normalized, WorkingPath(animation), StringComparison.OrdinalIgnoreCase))
            return FileChangeKind.Working;
        return normalized.StartsWith(FOLDER + "/", StringComparison.OrdinalIgnoreCase)
               && normalized.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
               && normalized.IndexOf('/', FOLDER.Length + 1) < 0
            ? FileChangeKind.OtherAnimation
            : FileChangeKind.Ignored;
    }

    private static string Normalize(string? path) => (path ?? string.Empty).Trim().Replace('\\', '/').TrimStart('.', '/');
}
