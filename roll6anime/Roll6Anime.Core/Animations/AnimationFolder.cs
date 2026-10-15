using System.Text.Json;
using Roll6.Domain.Animations;
using Roll6.Domain.Exceptions;

namespace Roll6Anime.Core.Animations;

/// <summary>
/// Reads and validates the animations folder (062). Validation is the backend's own <see cref="AnimationFormat"/>
/// (linked file), so every key and message is the Roll6's (FR-007, SC-003). Only reads: nothing here writes.
/// </summary>
public static class AnimationFolder
{
    /// <summary>Same text as the site's <c>parseAnimationText</c> for a file that is not JSON.</summary>
    public const string NOT_JSON = "O arquivo não é um JSON válido.";
    public const string TOO_LARGE = "O arquivo de animação passa de 1 MB.";

    private const int READ_TRIES = 5;
    private static readonly TimeSpan READ_PAUSE = TimeSpan.FromMilliseconds(50);

    /// <summary>The <c>*.json</c> files of the folder (no subfolders), read and validated, sorted by name ignoring case.</summary>
    public static List<AnimationEntry> List(string folder) =>
        Directory.Exists(folder)
            ? Directory.EnumerateFiles(folder, "*.json", SearchOption.TopDirectoryOnly)
                .Where(path => string.Equals(Path.GetExtension(path), ".json", StringComparison.OrdinalIgnoreCase))
                .OrderBy(path => Path.GetFileName(path), StringComparer.OrdinalIgnoreCase)
                .Select(path => Read(path, null))
                .ToList()
            : new List<AnimationEntry>();

    /// <summary>
    /// Reads one file. A valid read replaces what the entry plays; an invalid one only sets the error and keeps the
    /// previous valid content (FR-008). A file still locked by whoever writes it is retried a few times.
    /// </summary>
    public static AnimationEntry Read(string path, AnimationEntry? previous)
    {
        var entry = new AnimationEntry
        {
            FileName = Path.GetFileName(path),
            FullPath = path,
            Name = previous?.Name,
            Type = previous?.Type,
            Duration = previous?.Duration,
            Loop = previous?.Loop,
            Content = previous?.Content,
            ChangedAt = DateTime.Now,
        };

        byte[] bytes;
        try
        {
            bytes = ReadBytes(path);
            entry.Text = new System.Text.UTF8Encoding(false).GetString(bytes);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            entry.Error = new AnimationError("content", $"Não foi possível ler o arquivo: {ex.Message}");
            return entry;
        }

        if (bytes.Length > AnimationFormat.MAX_BYTES)
        {
            entry.Error = new AnimationError("content", TOO_LARGE);
            return entry;
        }

        JsonElement content;
        try
        {
            using var document = JsonDocument.Parse(bytes);
            content = document.RootElement.Clone();
        }
        catch (JsonException)
        {
            entry.Error = new AnimationError("content", NOT_JSON);
            return entry;
        }

        try
        {
            var file = AnimationFormat.Parse(content);
            entry.Content = content;
            entry.Name = file.Name;
            entry.Type = file.Type;
            entry.Duration = file.Duration;
            entry.Loop = file.Loop;
            entry.Error = null;
        }
        catch (DomainValidationException ex)
        {
            var (key, messages) = ex.Errors.First();
            entry.Error = new AnimationError(key, messages.FirstOrDefault() ?? string.Empty);
        }
        return entry;
    }

    private static byte[] ReadBytes(string path)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                using var memory = new MemoryStream();
                stream.CopyTo(memory);
                return memory.ToArray();
            }
            catch (IOException) when (attempt < READ_TRIES && File.Exists(path))
            {
                Thread.Sleep(READ_PAUSE);
            }
        }
    }
}
