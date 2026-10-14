using System.Text.RegularExpressions;
using Roll6.Domain.Animations;
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

    // File names produced by the 3D model upload (055): a glTF binary, stored as sent.
    private static readonly Regex MODEL_FILE_NAME_REGEX = new(@"^[0-9a-f]{32}\.glb$", RegexOptions.Compiled);

    // File names of the animation library (059): the validated JSON, written by the server itself.
    private static readonly Regex ANIMATION_FILE_NAME_REGEX = new(@"^[0-9a-f]{32}\.json$", RegexOptions.Compiled);

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

    /// <summary>Accepts only file names returned by the 3D model upload (055): {guid:N}.glb.</summary>
    public static string? ModelFileName(string? value, string field)
    {
        var fileName = OptionalText(value, field, 260);
        if (fileName != null && !MODEL_FILE_NAME_REGEX.IsMatch(fileName))
            throw new DomainValidationException(field, "Modelo inválido. Use o fileName retornado pelo upload.");
        return fileName;
    }

    /// <summary>Accepts only file names of the animation library (059): {guid:N}.json.</summary>
    public static string AnimationFileName(string? value, string field)
    {
        var fileName = RequiredText(value, field, 260);
        if (!ANIMATION_FILE_NAME_REGEX.IsMatch(fileName))
            throw new DomainValidationException(field, "Arquivo de animação inválido.");
        return fileName;
    }

    /// <summary>True for a name the animation library could have stored ({guid:N}.json).</summary>
    public static bool IsAnimationFileName(string? value) => value != null && ANIMATION_FILE_NAME_REGEX.IsMatch(value);

    /// <summary>True for a name the model upload could have produced ({guid:N}.glb).</summary>
    public static bool IsModelFileName(string? value) => value != null && MODEL_FILE_NAME_REGEX.IsMatch(value);

    /// <summary>Roll6's own animation, chosen for a 3D model (056).</summary>
    public const string MODEL_CLIP_ROLL6 = "roll6";
    /// <summary>Roll6's guard stance ("Posição defensiva"), chosen for a 3D model (057).</summary>
    public const string MODEL_CLIP_ROLL6_GUARD = "roll6-guard";
    /// <summary>No animation, chosen for a 3D model (056).</summary>
    public const string MODEL_CLIP_NONE = "none";
    /// <summary>Prefix of a clip of the file, chosen by its exact name (056): "clip:{name}".</summary>
    public const string MODEL_CLIP_PREFIX = "clip:";

    /// <summary>
    /// The animation chosen for one state of a 3D model (056): null/empty = automatic, "roll6", "roll6-guard" (057), "none" or
    /// "clip:{name}" with a non-empty name (the clip's name is kept as it is — the file decides its case and spaces), or
    /// "animation:{id}" (059, a library animation — its existence and type are checked by the token service).
    /// </summary>
    public static string? ModelClip(string? value, string field)
    {
        var choice = OptionalText(value, field, 260);
        if (choice == null || choice == MODEL_CLIP_ROLL6 || choice == MODEL_CLIP_ROLL6_GUARD || choice == MODEL_CLIP_NONE)
            return choice;
        if (choice.StartsWith(MODEL_CLIP_PREFIX, StringComparison.Ordinal) && choice.Length > MODEL_CLIP_PREFIX.Length)
            return choice;
        if (AnimationStates.ParseChoice(choice) != null)
            return choice;
        throw new DomainValidationException(field,
            "Animação inválida. Use \"roll6\", \"roll6-guard\", \"none\", \"clip:{nome}\" ou \"animation:{id}\".");
    }

    public static string Email(string? value, string field)
    {
        var email = RequiredText(value, field, 260).ToLowerInvariant();
        if (!EMAIL_REGEX.IsMatch(email))
            throw new DomainValidationException(field, "E-mail inválido.");
        return email;
    }
}
