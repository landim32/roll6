namespace Roll6.Console.Codex;

/// <summary>
/// Where the Codex keeps the pictures it generates (095 fix): <c>{CODEX_HOME or ~/.codex}/generated_images/{thread}/
/// exec-*.png</c>. The Codex is told to copy the final one to the requested path; when it ends without doing so (a live
/// run tried to write the PNG as base64 inside a shell command, too long for the command line), the console takes the
/// newest picture of that conversation made during the run.
/// </summary>
public static class CodexImages
{
    /// <summary>The Codex home: <c>CODEX_HOME</c> when set, else <c>~/.codex</c>.</summary>
    public static string Home() =>
        Environment.GetEnvironmentVariable("CODEX_HOME") is { Length: > 0 } home
            ? home
            : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".codex");

    /// <summary>The newest PNG of the conversation written at or after <paramref name="sinceUtc"/>; null when there is none.</summary>
    public static string? Latest(string codexHome, string threadId, DateTime sinceUtc)
    {
        if (string.IsNullOrWhiteSpace(threadId) || threadId.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            return null;
        var folder = Path.Combine(codexHome, "generated_images", threadId);
        if (!Directory.Exists(folder))
            return null;
        return new DirectoryInfo(folder).EnumerateFiles("*.png")
            .Where(f => f.LastWriteTimeUtc >= sinceUtc)
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .Select(f => f.FullName)
            .FirstOrDefault();
    }
}
