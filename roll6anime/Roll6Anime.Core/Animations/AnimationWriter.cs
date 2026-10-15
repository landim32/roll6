using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Roll6.Domain.Animations;
using Roll6.Domain.Exceptions;

namespace Roll6Anime.Core.Animations;

/// <summary>
/// Writes an animation file the pose editor changed (066): only after the backend's own <see cref="AnimationFormat"/>
/// accepts it, as indented JSON (2 spaces, UTF-8 without BOM, accents kept), through a temporary file moved over the old
/// one so a reader never sees half a file. The tool writes nothing else.
/// </summary>
public static class AnimationWriter
{
    private static readonly JsonSerializerOptions JSON = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>Validates and writes <paramref name="file"/> at <paramref name="path"/>; the Roll6's first error otherwise, and nothing written.</summary>
    public static AnimationError? Write(string path, JsonElement file)
    {
        try
        {
            AnimationFormat.Parse(file);
        }
        catch (DomainValidationException ex)
        {
            var (key, messages) = ex.Errors.First();
            return new AnimationError(key, messages.FirstOrDefault() ?? string.Empty);
        }
        WriteText(path, JsonSerializer.Serialize(file, JSON) + "\n");
        return null;
    }

    /// <summary>Writes a version of the history exactly as it was (Ctrl+Z / Ctrl+Y).</summary>
    public static void WriteText(string path, string content)
    {
        var temporary = path + ".tmp";
        File.WriteAllText(temporary, content, new UTF8Encoding(false));
        File.Move(temporary, path, overwrite: true);
    }
}
