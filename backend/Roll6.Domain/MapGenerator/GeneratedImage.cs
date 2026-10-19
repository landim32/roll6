using System.Security.Cryptography;

namespace Roll6.Domain.MapGenerator;

/// <summary>
/// The images of the map generator (095): where they live in the console's working directory, what a valid one is
/// (PNG, JPEG or WebP by signature, at most 10 MB) and the session ids. Pure.
/// </summary>
public static class GeneratedImage
{
    /// <summary>The folder of every generator session, relative to the console's working directory.</summary>
    public const string ROOT = "mapas-gerados";

    public const int MAX_BYTES = 10 * 1024 * 1024;

    public const string PNG = "image/png";
    public const string JPEG = "image/jpeg";
    public const string WEBP = "image/webp";

    private static readonly string[] EXTENSIONS = { ".png", ".jpg", ".jpeg", ".webp" };
    private const string ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

    /// <summary>"mapas-gerados/{id}/".</summary>
    public static string Folder(string sessionId) => $"{ROOT}/{sessionId}/";

    /// <summary>Where the Codex saves the version <paramref name="version"/>: "mapas-gerados/{id}/versao-{n}.png".</summary>
    public static string OutputPath(string sessionId, int version) => $"{ROOT}/{sessionId}/versao-{version}.png";

    /// <summary>An image the request carries: "mapas-gerados/{id}/entrada/{name}".</summary>
    public static string InputPath(string sessionId, string name) => $"{ROOT}/{sessionId}/entrada/{name}";

    /// <summary>A file the session's output folder holds directly (not under "entrada/"), with an image extension.</summary>
    public static bool IsOutputOf(string sessionId, string? path)
    {
        var normalized = (path ?? string.Empty).Trim().Replace('\\', '/').TrimStart('.', '/');
        var folder = Folder(sessionId);
        if (!normalized.StartsWith(folder, StringComparison.OrdinalIgnoreCase))
            return false;
        var rest = normalized[folder.Length..];
        return rest.Length > 0 && !rest.Contains('/') && IsImagePath(rest);
    }

    public static bool IsImagePath(string? path) =>
        EXTENSIONS.Any(e => (path ?? string.Empty).EndsWith(e, StringComparison.OrdinalIgnoreCase));

    /// <summary>The media type by the file's first bytes, or null when it is not a PNG, JPEG or WebP.</summary>
    public static string? MediaTypeOf(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
            && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A)
            return PNG;
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
            return JPEG;
        if (bytes.Length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
            && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P')
            return WEBP;
        return null;
    }

    /// <summary>The bytes of a base64 image when it is valid (decodes, ≤ 10 MB, known signature); else null.</summary>
    public static (byte[] Bytes, string MediaType)? Decode(string? base64)
    {
        if (string.IsNullOrEmpty(base64) || base64.Length > MAX_BYTES / 3 * 4 + 8)
            return null;
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(base64);
        }
        catch (FormatException)
        {
            return null;
        }
        if (bytes.Length == 0 || bytes.Length > MAX_BYTES)
            return null;
        var type = MediaTypeOf(bytes);
        return type == null ? null : (bytes, type);
    }

    /// <summary>A new session id: 12 lowercase letters and digits (also the folder name).</summary>
    public static string NewSessionId() => RandomNumberGenerator.GetString(ID_ALPHABET, 12);
}
