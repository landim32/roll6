namespace Roll6.Domain.Grid;

/// <summary>One piece on the map for the occupancy: position, facing and the hexes it takes now (031).</summary>
public record PieceShape(long MapTokenId, int X, int Y, int Look, int Space);

public enum FitResult
{
    Ok,
    OutsideGrid,
    Occupied
}

/// <summary>
/// Which piece takes each hex of a map (031): every hex of every piece's shape (<see cref="HexGrid.Footprint"/>).
/// Pure and framework-free; mirror of occupancy.ts in the frontend. Pieces may overlap (a piece that lay down over
/// another one stays so until it moves): a hex then keeps the first piece, and any other piece counts as occupying it.
/// </summary>
public class Occupancy
{
    private readonly Dictionary<(int X, int Y), List<long>> _hexes = new();

    private Occupancy() { }

    public static Occupancy Build(IEnumerable<PieceShape> pieces)
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
        return occupancy;
    }

    /// <summary>
    /// The groups of pieces that share at least one hex (069: what keeps free mode on). Pieces linked through different
    /// hexes (A with B on one, B with C on another) form one group. Groups come in the order of the first hex where they
    /// meet (row, then column) and the pieces of a group in the order they were met.
    /// </summary>
    public IReadOnlyList<IReadOnlyList<long>> Overlaps()
    {
        var parent = new Dictionary<long, long>();
        long Find(long id)
        {
            while (parent[id] != id)
                id = parent[id] = parent[parent[id]];
            return id;
        }
        var order = new List<long>();
        foreach (var (_, ids) in _hexes.Where(e => e.Value.Count > 1).OrderBy(e => e.Key.Y).ThenBy(e => e.Key.X))
        {
            foreach (var id in ids)
                if (parent.TryAdd(id, id))
                    order.Add(id);
            for (var i = 1; i < ids.Count; i++)
            {
                var a = Find(ids[0]);
                var b = Find(ids[i]);
                if (a != b)
                    parent[b] = a;
            }
        }
        return order.GroupBy(Find).Select(g => (IReadOnlyList<long>)g.ToList()).ToList();
    }

    /// <summary>The piece on the hex (the first one when pieces overlap), or null.</summary>
    public long? PieceAt(int x, int y) => _hexes.TryGetValue((x, y), out var ids) ? ids[0] : null;

    /// <summary>True when a piece other than <paramref name="exceptMapTokenId"/> takes the hex.</summary>
    public bool IsBlocked(int x, int y, long? exceptMapTokenId) =>
        _hexes.TryGetValue((x, y), out var ids) && ids.Any(id => id != exceptMapTokenId);

    /// <summary>
    /// Whether a shape fits: every hex inside the grid (<paramref name="columns"/> × <paramref name="rows"/>) and taken
    /// by no other piece. Outside the grid wins over occupied.
    /// </summary>
    public FitResult Fits(IEnumerable<(int X, int Y)> hexes, int columns, int rows, long? exceptMapTokenId)
    {
        var list = hexes.ToList();
        if (list.Any(h => !HexGrid.IsInsideGrid(h.X, h.Y, columns, rows)))
            return FitResult.OutsideGrid;
        return list.Any(h => IsBlocked(h.X, h.Y, exceptMapTokenId)) ? FitResult.Occupied : FitResult.Ok;
    }

    /// <summary>
    /// The free hex nearest to the middle of the grid where a shape of <paramref name="space"/> hexes facing
    /// <paramref name="look"/> fits whole (052: "Incluir NPC" on an NPC already in the campaign places another instance
    /// without asking where). Ties go to the upper rows, then the left columns; null when nothing fits.
    /// </summary>
    public (int X, int Y)? FirstFree(int look, int space, int columns, int rows)
    {
        var (cq, cr) = HexGrid.OffsetToAxial(columns / 2, rows / 2);
        var candidates = new List<(int Distance, int X, int Y)>();
        for (var y = 0; y < rows; y++)
            for (var x = 0; x < columns; x++)
            {
                var (q, r) = HexGrid.OffsetToAxial(x, y);
                var (dq, dr) = (q - cq, r - cr);
                var distance = (Math.Abs(dq) + Math.Abs(dr) + Math.Abs(dq + dr)) / 2;
                candidates.Add((distance, x, y));
            }
        foreach (var (_, x, y) in candidates.OrderBy(c => c.Distance).ThenBy(c => c.Y).ThenBy(c => c.X))
            if (Fits(HexGrid.Footprint(x, y, look, space), columns, rows, null) == FitResult.Ok)
                return (x, y);
        return null;
    }
}
