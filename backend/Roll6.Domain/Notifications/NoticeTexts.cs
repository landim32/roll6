using System.Text.RegularExpressions;

namespace Roll6.Domain.Notifications;

/// <summary>The texts of the notices (043, pt-BR): pure, so every wording is pinned by tests.</summary>
public static class NoticeTexts
{
    /// <summary>How much of a message or action a notification shows.</summary>
    public const int MAX_BODY = 120;

    private static readonly Regex IMAGE = new(@"!\[[^\]]*\]\([^)]*\)", RegexOptions.Compiled);
    private static readonly Regex LINK = new(@"\[([^\]]*)\]\([^)]*\)", RegexOptions.Compiled);
    private static readonly Regex MARKS = new(@"[*_`~#>|]+", RegexOptions.Compiled);
    private static readonly Regex SPACES = new(@"\s+", RegexOptions.Compiled);

    /// <summary>Markdown as plain text on one line: images out, links as their text, marks removed.</summary>
    public static string Plain(string? markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
            return string.Empty;
        var text = IMAGE.Replace(markdown, " ");
        text = LINK.Replace(text, "$1");
        text = MARKS.Replace(text, " ");
        return SPACES.Replace(text, " ").Trim();
    }

    /// <summary>At most <paramref name="max"/> characters, cut at a word with "…".</summary>
    public static string Ellipsize(string text, int max = MAX_BODY)
    {
        if (text.Length <= max)
            return text;
        var cut = text[..(max - 1)];
        var space = cut.LastIndexOf(' ');
        if (space > max / 2)
            cut = cut[..space];
        return cut.TrimEnd(' ', ',', ';', ':', '.', '-') + "…";
    }

    /// <summary>The body of a message or action: plain text, ellipsized.</summary>
    public static string Excerpt(string? markdown) => Ellipsize(Plain(markdown));

    public static string FirstName(string? name)
    {
        var trimmed = name?.Trim() ?? string.Empty;
        var space = trimmed.IndexOf(' ');
        return space < 0 ? trimmed : trimmed[..space];
    }

    /// <summary>"A", "A e B", "A, B e C".</summary>
    public static string JoinNames(IReadOnlyList<string> names) => names.Count switch
    {
        0 => string.Empty,
        1 => names[0],
        _ => string.Join(", ", names.Take(names.Count - 1)) + " e " + names[^1]
    };

    public const string PHOTO = "enviou uma foto";
    public const string AUDIO = "enviou um áudio";

    public static string Roll(int total) => $"rolou 3d6: total {total}";

    public static string Narration(string? text) => Ellipsize("Narração: " + Plain(text));

    /// <summary>N3: "Falta apenas você", "Falta apenas você e Bruno", "Falta apenas você, Bruno e Ana".</summary>
    public static string Majority(IReadOnlyList<string> otherFirstNames) =>
        "Falta apenas " + JoinNames(new[] { "você" }.Concat(otherFirstNames).ToList());

    public static string TurnFinished(int turnNo) => $"Turno {turnNo} terminado. Pode agir novamente";

    public static string Life(int current, int total) => $"Você está com {current}/{total} PV";

    public static string Fatigue(int current, int total) => $"Você está com {current}/{total} de Fadiga";

    public static string Poke(string pokerFirstName) => $"{pokerFirstName} está cutucando você";

    /// <summary>The chat line of a poke: "Rodrigo cutucou Ana e Bruno".</summary>
    public static string PokeLine(string pokerFirstName, string pokedNames) => $"{pokerFirstName} cutucou {pokedNames}";

    /// <summary>"Aria · Tormento Vil", or the campaign alone.</summary>
    public static string Title(string? speaker, string campaignName) =>
        string.IsNullOrWhiteSpace(speaker) ? campaignName : $"{speaker} · {campaignName}";
}
