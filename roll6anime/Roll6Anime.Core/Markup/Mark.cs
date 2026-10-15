namespace Roll6Anime.Core.Markup;

/// <summary>The four red marks the user can draw on a print of the 3D view (064).</summary>
public enum MarkKind
{
    /// <summary>A free stroke ("Lápis").</summary>
    Pencil,
    /// <summary>A dotted rectangle between the two corners dragged.</summary>
    Rectangle,
    /// <summary>A dotted ellipse inscribed in the rectangle dragged ("Circunferência"; a square gives a circle).</summary>
    Ellipse,
    /// <summary>A line with its head at the point where the drag ended.</summary>
    Arrow,
}

/// <summary>A point in the print's own pixels (origin at the top-left corner).</summary>
public readonly record struct MarkPoint(double X, double Y);

/// <summary>
/// One mark: a pencil keeps every point of the stroke; a rectangle, an ellipse and an arrow keep exactly two — where the
/// drag started and where it ended.
/// </summary>
public sealed record Mark(MarkKind Kind, IReadOnlyList<MarkPoint> Points);
