namespace Roll6.Domain.Models;

/// <summary>One field changed in a character/NPC during a turn (024): the value before and after, as text.</summary>
public class TurnChange
{
    public string Field { get; set; } = string.Empty;
    public string? Before { get; set; }
    public string? After { get; set; }

    public TurnChange() { }

    public TurnChange(string field, string? before, string? after)
    {
        Field = field;
        Before = before;
        After = after;
    }

    /// <summary>Only the fields whose text changed (null and empty count as the same value).</summary>
    public static List<TurnChange> Diff(params (string Field, object? Before, object? After)[] pairs) =>
        pairs.Select(p => (p.Field, Before: ToText(p.Before), After: ToText(p.After)))
            .Where(p => (p.Before ?? string.Empty) != (p.After ?? string.Empty))
            .Select(p => new TurnChange(p.Field, p.Before, p.After))
            .ToList();

    private static string? ToText(object? value) => value switch
    {
        null => null,
        string text => string.IsNullOrEmpty(text) ? null : text,
        IFormattable number => number.ToString(null, System.Globalization.CultureInfo.InvariantCulture),
        _ => value.ToString()
    };
}
