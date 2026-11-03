using Roll6.Domain.Enums;
using Roll6.Domain.Maps;

namespace Roll6.Domain.Models;

/// <summary>
/// A drawing on a campaign map (107): rectangle, circle, pencil stroke, line or arrow, in map pixels, outline only.
/// Created and deleted, never changed. Drawing order = id order (newest on top).
/// </summary>
public class MapDrawing
{
    public const int MAX_PER_MAP = 500;

    public long MapDrawingId { get; set; }
    public long MapId { get; set; }
    public DrawingKind Kind { get; set; }

    /// <summary>[[x, y], …] in map pixels (stored as jsonb).</summary>
    public List<int[]> Points { get; set; } = new();

    /// <summary>#rrggbb, lower case.</summary>
    public string Color { get; set; } = string.Empty;
    public int Width { get; set; }
    public float Opacity { get; set; }
    public long UserId { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>A checked drawing (<see cref="DrawingShape.Check"/>) for a grid of columns × rows.</summary>
    public static MapDrawing Create(long mapId, int kind, IReadOnlyList<int[]>? points, string? color, int width, double opacity,
        int columns, int rows, long userId, DateTime now)
    {
        var shape = DrawingShape.Check(kind, points, color, width, opacity, columns, rows);
        return new MapDrawing
        {
            MapId = mapId,
            Kind = shape.Kind,
            Points = shape.Points.ToList(),
            Color = shape.Color,
            Width = shape.Width,
            Opacity = shape.Opacity,
            UserId = userId,
            CreatedAt = now
        };
    }
}
