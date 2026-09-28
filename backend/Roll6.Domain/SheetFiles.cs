namespace Roll6.Domain;

/// <summary>Kind of a character sheet file (022), taken from the stored file name's extension.</summary>
public static class SheetFiles
{
    public const string IMAGE = "image";
    public const string PDF = "pdf";

    /// <summary>"pdf" for .pdf, "image" for png/jpg/webp, null without a file.</summary>
    public static string? TypeOf(string? fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return null;
        return fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? PDF : IMAGE;
    }
}
