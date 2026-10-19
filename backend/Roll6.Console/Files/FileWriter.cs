using System.Text;

namespace Roll6.Console.Files;

/// <summary>
/// Writes the files the server asks for (086), always inside the working directory: UTF-8 without BOM, through a
/// temporary file moved over the old one so a reader never sees half a file; a file that already holds the exact text is
/// left alone (no watcher echo, no useless write). The console validates nothing.
/// </summary>
public static class FileWriter
{
    public const string OUTSIDE = "caminho fora da pasta de trabalho";

    private static readonly UTF8Encoding UTF8 = new(false);

    /// <summary>
    /// The full path of a relative one inside the working directory, or null when it would leave it (".." or an absolute
    /// path).
    /// </summary>
    public static string? Resolve(string workingDirectory, string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath) || Path.IsPathRooted(relativePath))
            return null;
        var root = Path.GetFullPath(workingDirectory);
        var full = Path.GetFullPath(Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var rootWithSeparator = root.EndsWith(Path.DirectorySeparatorChar) ? root : root + Path.DirectorySeparatorChar;
        return full.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase) ? full : null;
    }

    /// <summary>The path as the server names it (forward slashes, relative to the working directory).</summary>
    public static string Relative(string workingDirectory, string fullPath) =>
        Path.GetRelativePath(Path.GetFullPath(workingDirectory), fullPath).Replace('\\', '/');

    /// <summary>095: the extensions reported (and written) as bytes in base64 instead of text.</summary>
    public static readonly IReadOnlyList<string> BINARY_EXTENSIONS = new[] { ".png", ".jpg", ".jpeg", ".webp" };

    /// <summary>Largest binary file reported back (10 MB).</summary>
    public const int MAX_BINARY_BYTES = 10 * 1024 * 1024;

    public static bool IsBinary(string path) =>
        BINARY_EXTENSIONS.Any(e => path.EndsWith(e, StringComparison.OrdinalIgnoreCase));

    /// <summary>095: writes base64 bytes (temp + move); returns whether the file changed.</summary>
    public static bool WriteBytes(string workingDirectory, string relativePath, string base64)
    {
        var path = Resolve(workingDirectory, relativePath) ?? throw new InvalidOperationException(OUTSIDE);
        var bytes = Convert.FromBase64String(base64);
        if (File.Exists(path) && File.ReadAllBytes(path).AsSpan().SequenceEqual(bytes))
            return false;
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporary = path + ".tmp";
        File.WriteAllBytes(temporary, bytes);
        File.Move(temporary, path, overwrite: true);
        return true;
    }

    /// <summary>Writes the text; returns whether the file changed. Throws <see cref="InvalidOperationException"/> for a path outside.</summary>
    public static bool Write(string workingDirectory, string relativePath, string content)
    {
        var path = Resolve(workingDirectory, relativePath) ?? throw new InvalidOperationException(OUTSIDE);
        if (File.Exists(path) && File.ReadAllText(path, UTF8) == content)
            return false;
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporary = path + ".tmp";
        File.WriteAllText(temporary, content, UTF8);
        File.Move(temporary, path, overwrite: true);
        return true;
    }
}
