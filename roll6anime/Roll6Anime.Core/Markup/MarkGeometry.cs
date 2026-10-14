namespace Roll6Anime.Core.Markup;

/// <summary>A rectangle in the print's pixels, with a positive width and height.</summary>
public readonly record struct MarkBounds(double X, double Y, double Width, double Height);

/// <summary>The head of an arrow: its tip and the two back corners of the filled triangle.</summary>
public readonly record struct ArrowHeadPoints(MarkPoint Tip, MarkPoint Left, MarkPoint Right, MarkPoint Base);

/// <summary>
/// The pure geometry of the marks (064, research R3/R4): how thick they are, how far they may go, what counts as a mark
/// and the shape of an arrow's head. Everything is in the print's pixels, so the screen and the PNG agree.
/// </summary>
public static class MarkGeometry
{
    /// <summary>Length of a dash and of the gap between dashes, as multiples of the stroke width.</summary>
    public const double DASH = 2.0;
    public const double GAP = 1.5;

    private const double MIN_PENCIL_EXTENT = 3;
    private const double MIN_SHAPE_SIDE = 4;
    private const double MIN_ARROW_LENGTH = 8;

    /// <summary>The width of every mark on a print of this size: readable on 700–2000 px prints, never hiding what it points at.</summary>
    public static double StrokeWidth(int width, int height) =>
        Math.Clamp(Math.Round(Math.Min(width, height) / 160.0), 3, 12);

    /// <summary>A point kept inside the print (a drag that goes past the edge stops at it).</summary>
    public static MarkPoint Clamp(MarkPoint point, int width, int height) =>
        new(Math.Clamp(point.X, 0, width), Math.Clamp(point.Y, 0, height));

    /// <summary>The rectangle between two corners dragged in any direction.</summary>
    public static MarkBounds Bounds(MarkPoint a, MarkPoint b) =>
        new(Math.Min(a.X, b.X), Math.Min(a.Y, b.Y), Math.Abs(b.X - a.X), Math.Abs(b.Y - a.Y));

    /// <summary>Whether a mark is big enough to keep: a click without a drag draws nothing.</summary>
    public static bool IsMeaningful(Mark mark)
    {
        var points = mark.Points;
        switch (mark.Kind)
        {
            case MarkKind.Pencil:
                if (points.Count < 2)
                    return false;
                var width = points.Max(p => p.X) - points.Min(p => p.X);
                var height = points.Max(p => p.Y) - points.Min(p => p.Y);
                return Math.Max(width, height) >= MIN_PENCIL_EXTENT;
            case MarkKind.Rectangle:
            case MarkKind.Ellipse:
                if (points.Count != 2)
                    return false;
                var box = Bounds(points[0], points[1]);
                return box.Width >= MIN_SHAPE_SIDE && box.Height >= MIN_SHAPE_SIDE;
            case MarkKind.Arrow:
                return points.Count == 2 && Length(points[0], points[1]) >= MIN_ARROW_LENGTH;
            default:
                return false;
        }
    }

    /// <summary>
    /// The head of an arrow from <paramref name="from"/> to <paramref name="to"/>: a filled triangle with its tip on the end
    /// point, as long as 35% of the arrow but never shorter than 3 strokes nor longer than 7, half as wide as 0.6 of its
    /// length. <see cref="ArrowHeadPoints.Base"/> is where the line stops, so its round cap does not poke out of the tip.
    /// </summary>
    public static ArrowHeadPoints ArrowHead(MarkPoint from, MarkPoint to, double stroke)
    {
        var length = Length(from, to);
        var dx = length > 0 ? (to.X - from.X) / length : 1;
        var dy = length > 0 ? (to.Y - from.Y) / length : 0;
        var head = Math.Clamp(0.35 * length, 3 * stroke, 7 * stroke);
        var half = 0.6 * head;
        var baseX = to.X - dx * head;
        var baseY = to.Y - dy * head;
        // Perpendicular to the arrow: (−dy, dx).
        return new ArrowHeadPoints(
            to,
            new MarkPoint(baseX - dy * half, baseY + dx * half),
            new MarkPoint(baseX + dy * half, baseY - dx * half),
            new MarkPoint(baseX, baseY));
    }

    public static double Length(MarkPoint a, MarkPoint b) => Math.Sqrt((b.X - a.X) * (b.X - a.X) + (b.Y - a.Y) * (b.Y - a.Y));
}
