using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Models;

/// <summary>One answer of a chat poll (045), in the order the author wrote them.</summary>
public class ChatPollOption
{
    public const int MAX_QUESTION = 300;
    public const int MAX_TEXT = 100;
    public const int MIN_OPTIONS = 2;
    public const int MAX_OPTIONS = 12;

    public long ChatPollOptionId { get; set; }
    public long TurnId { get; set; }
    public int Position { get; set; }
    public string Text { get; set; } = string.Empty;

    public static ChatPollOption Create(long turnId, int position, string text) =>
        new() { TurnId = turnId, Position = position, Text = text };

    /// <summary>
    /// The options as they will be saved: trimmed, empty ones dropped, 2–12 of 1–100 characters and no two alike
    /// (ignoring case and spaces) — else 400 keyed <c>options</c>.
    /// </summary>
    public static List<string> CheckAll(IEnumerable<string?>? options)
    {
        var list = (options ?? Enumerable.Empty<string?>())
            .Select(o => o?.Trim() ?? string.Empty).Where(o => o.Length > 0).ToList();
        if (list.Count < MIN_OPTIONS || list.Count > MAX_OPTIONS)
            throw new DomainValidationException("options", $"A enquete deve ter de {MIN_OPTIONS} a {MAX_OPTIONS} opções.");
        if (list.Any(o => o.Length > MAX_TEXT))
            throw new DomainValidationException("options", $"Cada opção deve ter no máximo {MAX_TEXT} caracteres.");
        if (list.Select(Normalize).Distinct().Count() != list.Count)
            throw new DomainValidationException("options", "As opções não podem se repetir.");
        return list;
    }

    /// <summary>"  Vila  da Torre " and "vila da torre" are the same option.</summary>
    public static string Normalize(string text) =>
        string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();
}
