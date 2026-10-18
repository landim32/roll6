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
