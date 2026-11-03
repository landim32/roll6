using Roll6.Domain.Enums;

namespace Roll6.Domain.Models;

/// <summary>
/// A painted hex of a campaign map (107): one row per hex (unique map + x + y), never on the map model. Informative
/// only — no movement or occupancy rule reads it. <see cref="Text"/> only for <see cref="HexMarkKind.Mark"/>.
/// </summary>
public class MapHexMark
{
    public const int MAX_TEXT = 100;

    public long MapHexMarkId { get; set; }
    public long MapId { get; set; }

    /// <summary>Column / row of the hex ("odd-q" offset layout, like pieces).</summary>
    public int X { get; set; }
    public int Y { get; set; }

    public HexMarkKind Kind { get; set; }
    public string? Text { get; set; }

    /// <summary>Author of the last change.</summary>
    public long UserId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>A new mark; kind/text already checked by <c>HexMarkSet.Parse</c>.</summary>
    public static MapHexMark Create(long mapId, int x, int y, HexMarkKind kind, string? text, long userId, DateTime now) => new()
    {
        MapId = mapId,
        X = x,
        Y = y,
        Kind = kind,
        Text = kind == HexMarkKind.Mark ? text : null,
        UserId = userId,
        CreatedAt = now,
        UpdatedAt = now
    };

    /// <summary>Paints the hex again; false when nothing changed.</summary>
    public bool Change(HexMarkKind kind, string? text, long userId, DateTime now)
    {
        var newText = kind == HexMarkKind.Mark ? text : null;
        if (Kind == kind && Text == newText)
            return false;
        Kind = kind;
        Text = newText;
        UserId = userId;
        UpdatedAt = now;
        return true;
    }

    /// <summary>Same kind and text as another mark of the same hex.</summary>
    public bool SameAs(MapHexMark other) => Kind == other.Kind && Text == other.Text;
}
