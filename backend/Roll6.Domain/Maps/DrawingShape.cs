using System.Text.RegularExpressions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;

namespace Roll6.Domain.Maps;

/// <summary>A checked drawing (107): kind, points (map px), #rrggbb lower case, width, opacity.</summary>
public sealed record DrawingShapeInfo(DrawingKind Kind, IReadOnlyList<int[]> Points, string Color, int Width, float Opacity);

/// <summary>
/// Rules of a drawing on a campaign map (107). Rectangle = 2 corners, Circle = center + a point on the circle,
/// Line/Arrow = start + end, Pencil = 2 to 2000 points; every coordinate within 20000 px of the grid (the image-offset
/// bound). Errors keyed <c>kind</c>, <c>points</c>, <c>color</c>, <c>width</c>, <c>opacity</c>.
/// </summary>
public static partial class DrawingShape
{
    public const int MAX_PENCIL_POINTS = 2000;
    public const int MIN_WIDTH = 1;
    public const int MAX_WIDTH = 200;
    public const double MIN_OPACITY = 0.05;
    public const double MAX_OPACITY = 1;
    public const int MARGIN = 20000;

    public const string UNKNOWN_KIND = "O tipo deve ser de 1 a 5.";
    public const string WRONG_POINTS = "Pontos inválidos para este desenho.";
    public const string OUTSIDE = "O desenho sai demais do mapa.";
    public const string TOO_SMALL = "O desenho é pequeno demais.";
    public const string BAD_COLOR = "A cor deve ser #rrggbb.";
    public const string BAD_WIDTH = "A espessura deve ser de 1 a 200.";
    public const string BAD_OPACITY = "A opacidade deve ser de 0,05 a 1.";

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex ColorPattern();

    /// <summary>Width (px) of a grid of this many columns: flat-top hexes of <see cref="HexGrid.HEX_SIZE"/>, from 0.</summary>
    public static int GridPixelWidth(int columns) =>
        (int)Math.Ceiling(HexGrid.HEX_SIZE * (1.5 * Math.Max(columns - 1, 0) + 2));

    /// <summary>Height (px) of a grid of this many rows (odd columns shifted half a hex down).</summary>
    public static int GridPixelHeight(int rows) =>
        (int)Math.Ceiling(Math.Sqrt(3) * HexGrid.HEX_SIZE * (rows + 0.5));

    public static DrawingShapeInfo Check(int kind, IReadOnlyList<int[]>? points, string? color, int width, double opacity,
        int columns, int rows)
    {
        if (!Enum.IsDefined(typeof(DrawingKind), kind))
            throw new DomainValidationException("kind", UNKNOWN_KIND);
        var drawingKind = (DrawingKind)kind;
        if (points == null || points.Any(p => p == null || p.Length != 2))
            throw new DomainValidationException("points", WRONG_POINTS);
        var countOk = drawingKind == DrawingKind.Pencil
            ? points.Count is >= 2 and <= MAX_PENCIL_POINTS
            : points.Count == 2;
        if (!countOk)
            throw new DomainValidationException("points", WRONG_POINTS);
        long maxX = (long)GridPixelWidth(columns) + MARGIN;
        long maxY = (long)GridPixelHeight(rows) + MARGIN;
        if (points.Any(p => p[0] < -MARGIN || p[1] < -MARGIN || p[0] > maxX || p[1] > maxY))
            throw new DomainValidationException("points", OUTSIDE);
        if (points.All(p => p[0] == points[0][0] && p[1] == points[0][1]))
            throw new DomainValidationException("points", TOO_SMALL);
        if (color == null || !ColorPattern().IsMatch(color.Trim()))
            throw new DomainValidationException("color", BAD_COLOR);
        if (width is < MIN_WIDTH or > MAX_WIDTH)
            throw new DomainValidationException("width", BAD_WIDTH);
        if (double.IsNaN(opacity) || opacity < MIN_OPACITY - 1e-9 || opacity > MAX_OPACITY + 1e-9)
            throw new DomainValidationException("opacity", BAD_OPACITY);
        return new DrawingShapeInfo(drawingKind, points.Select(p => new[] { p[0], p[1] }).ToList(),
            color.Trim().ToLowerInvariant(), width, (float)Math.Clamp(opacity, MIN_OPACITY, MAX_OPACITY));
    }
}
