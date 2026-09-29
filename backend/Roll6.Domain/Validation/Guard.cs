using System.Text.RegularExpressions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Validation;

public static class Guard
{
    private static readonly Regex EMAIL_REGEX = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    // File names produced by the image upload: {guid:N}.{png|jpg|webp} (the storage folder is not part of it).
    private static readonly Regex IMAGE_FILE_NAME_REGEX = new(@"^[0-9a-f]{32}\.(png|jpg|webp)$", RegexOptions.Compiled);

    // File names produced by the document upload (022): images or PDF, stored as sent.
    private static readonly Regex SHEET_FILE_NAME_REGEX = new(@"^[0-9a-f]{32}\.(png|jpg|webp|pdf)$", RegexOptions.Compiled);

    public static string RequiredText(string? value, string field, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
            throw new DomainValidationException(field, $"O campo {field} é obrigatório.");
        if (trimmed.Length > maxLength)
            throw new DomainValidationException(field, $"O campo {field} deve ter no máximo {maxLength} caracteres.");
        return trimmed;
    }

    public static string? OptionalText(string? value, string field, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return null;
        if (trimmed.Length > maxLength)
            throw new DomainValidationException(field, $"O campo {field} deve ter no máximo {maxLength} caracteres.");
        return trimmed;
    }

    public static int NonNegative(int value, string field)
    {
        if (value < 0)
            throw new DomainValidationException(field, $"O campo {field} não pode ser negativo.");
        return value;
    }

    /// <summary>Token sizes (031): 1, 2, 3, 7 or 10 hexes.</summary>
    public static int TokenSpace(int value, string field)
    {
        if (!Grid.HexGrid.IsAllowedSpace(value))
            throw new DomainValidationException(field, "O tamanho deve ser 1, 2, 3, 7 ou 10 hexes.");
        return value;
    }

    /// <summary>One of the postures of a character/NPC on the map (031).</summary>
    public static Posture ValidPosture(int value, string field)
    {
        if (!Enum.IsDefined(typeof(Posture), value))
            throw new DomainValidationException(field, "A postura deve ser 1 (Em pé), 2 (Caído) ou 3 (Fora de combate).");
        return (Posture)value;
    }

    /// <summary>Accepts only file names returned by the image upload.</summary>
    public static string? ImageFileName(string? value, string field)
    {
        var fileName = OptionalText(value, field, 260);
        if (fileName != null && !IMAGE_FILE_NAME_REGEX.IsMatch(fileName))
            throw new DomainValidationException(field, "Imagem inválida. Use o fileName retornado pelo upload.");
        return fileName;
    }

    /// <summary>Accepts only file names returned by the document upload (character sheet file, 022).</summary>
    public static string? SheetFileName(string? value, string field)
    {
        var fileName = OptionalText(value, field, 260);
        if (fileName != null && !SHEET_FILE_NAME_REGEX.IsMatch(fileName))
            throw new DomainValidationException(field, "Arquivo inválido. Use o fileName retornado pelo upload.");
        return fileName;
    }

    public static string Email(string? value, string field)
    {
        var email = RequiredText(value, field, 260).ToLowerInvariant();
        if (!EMAIL_REGEX.IsMatch(email))
            throw new DomainValidationException(field, "E-mail inválido.");
        return email;
    }
}
