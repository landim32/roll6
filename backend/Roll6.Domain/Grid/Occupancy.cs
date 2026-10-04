namespace Roll6.Domain.Grid;

/// <summary>One piece on the map for the occupancy: position, facing and the hexes it takes now (031).</summary>
public record PieceShape(long MapTokenId, int X, int Y, int Look, int Space);

public enum FitResult
{
    Ok,
    OutsideGrid,
    /// <summary>A hex of the shape is a wall of a story map (033).</summary>
    Wall,
    Occupied
}

/// <summary>
/// Which piece takes each hex of a map (031): every hex of every piece's shape (<see cref="HexGrid.Footprint"/>), plus
/// the walls of a story map (033), which block every piece. Pure and framework-free; mirror of occupancy.ts in the
/// frontend. Pieces may overlap (a piece that lay down over another one stays so until it moves): a hex then keeps the
/// first piece, and any other piece counts as occupying it.
/// </summary>
public class Occupancy
{
    private readonly Dictionary<(int X, int Y), List<long>> _hexes = new();
    private readonly HashSet<(int X, int Y)> _walls = new();

    private Occupancy() { }

    public static Occupancy Build(IEnumerable<PieceShape> pieces, IEnumerable<(int X, int Y)>? walls = null)
    {
        var occupancy = new Occupancy();
        foreach (var piece in pieces)
        {
            foreach (var hex in HexGrid.Footprint(piece.X, piece.Y, piece.Look, piece.Space))
            {
                if (!occupancy._hexes.TryGetValue(hex, out var ids))
                    occupancy._hexes[hex] = ids = new List<long>();
                ids.Add(piece.MapTokenId);
            }
        }
        if (walls != null)
            occupancy._walls.UnionWith(walls);
        return occupancy;
    }

    /// <summary>The piece on the hex (the first one when pieces overlap), or null. Walls are not pieces.</summary>
    public long? PieceAt(int x, int y) => _hexes.TryGetValue((x, y), out var ids) ? ids[0] : null;

    /// <summary>True when the hex is a wall (033).</summary>
    public bool IsWall(int x, int y) => _walls.Contains((x, y));

    /// <summary>True when the hex is a wall or a piece other than <paramref name="exceptMapTokenId"/> takes it.</summary>
    public bool IsBlocked(int x, int y, long? exceptMapTokenId) =>
        IsWall(x, y) || (_hexes.TryGetValue((x, y), out var ids) && ids.Any(id => id != exceptMapTokenId));

    /// <summary>
    /// Whether a shape fits: every hex inside the grid (<paramref name="columns"/> × <paramref name="rows"/>), on no wall
    /// and taken by no other piece. Outside the grid wins over a wall, which wins over occupied.
    /// </summary>
    public FitResult Fits(IEnumerable<(int X, int Y)> hexes, int columns, int rows, long? exceptMapTokenId)
    {
        var list = hexes.ToList();
        if (list.Any(h => !HexGrid.IsInsideGrid(h.X, h.Y, columns, rows)))
            return FitResult.OutsideGrid;
        if (list.Any(h => IsWall(h.X, h.Y)))
            return FitResult.Wall;
        return list.Any(h => IsBlocked(h.X, h.Y, exceptMapTokenId)) ? FitResult.Occupied : FitResult.Ok;
    }
}
