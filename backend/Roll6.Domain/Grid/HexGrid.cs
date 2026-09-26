namespace Roll6.Domain.Grid;

/// <summary>
/// Hex grid math for flat-top hexagons, following "Size and Spacing" in
/// https://www.redblobgames.com/grids/hexagons/. Pure and framework-free: the frontend keeps an
/// identical module, so any change here must be mirrored there (constitution Principle VII).
/// </summary>
public static class HexGrid
{
    /// <summary>
    /// Fixed hex size (center to corner, px) used by every grid. The grid never changes size when
    /// the scene image is moved or resized; the image is adjusted under it.
    /// </summary>
    public const int HEX_SIZE = 40;

    /// <summary>
    /// Stored column/row ("odd-q" offset: odd columns shifted half a hex down) to axial, for
    /// distance/neighbor/line math. See "Offset coordinates" → "Conversions" in the guide.
    /// </summary>
    public static (int Q, int R) OffsetToAxial(int x, int y)
    {
        return (x, y - (x - (x & 1)) / 2);
    }

    /// <summary>Axial back to the stored column/row ("odd-q" offset).</summary>
    public static (int X, int Y) AxialToOffset(int q, int r)
    {
        return (q, r + (q - (q & 1)) / 2);
    }

    /// <summary>
    /// Nearest hex to a fractional axial coordinate: round the three cube components and fix the one
    /// with the largest change so that q + r + s = 0 ("Rounding to nearest hex" in the guide). Halves round
    /// up, like Math.round in the frontend module.
    /// </summary>
    public static (int Q, int R) HexRound(double q, double r)
    {
        var s = -q - r;
        var rq = Math.Floor(q + 0.5);
        var rr = Math.Floor(r + 0.5);
        var rs = Math.Floor(s + 0.5);
        var dq = Math.Abs(rq - q);
        var dr = Math.Abs(rr - r);
        var ds = Math.Abs(rs - s);
        if (dq > dr && dq > ds)
            rq = -rr - rs;
        else if (dr > ds)
            rr = -rq - rs;
        return ((int)rq, (int)rr);
    }

    /// <summary>
    /// Map point (px) to the stored column/row of the hex under it ("Pixel to Hex" for flat-top hexes).
    /// The layout origin is the center of hex (0, 0): (size, √3/2·size), so the grid starts at (0, 0).
    /// </summary>
    public static (int X, int Y) PixelToHex(double px, double py, double size)
    {
        var x = px - size;
        var y = py - Math.Sqrt(3) / 2 * size;
        var q = 2.0 / 3 * x / size;
        var r = (-1.0 / 3 * x + Math.Sqrt(3) / 3 * y) / size;
        var (hq, hr) = HexRound(q, r);
        return AxialToOffset(hq, hr);
    }

    /// <summary>
    /// Axial direction of each facing (look 0–5, clockwise from the top of a flat-top hex): top, top-right,
    /// bottom-right, bottom, bottom-left, top-left ("Neighbors" in the guide).
    /// </summary>
    public static readonly (int Q, int R)[] LookDirections = { (0, -1), (1, -1), (1, 0), (0, 1), (-1, 1), (-1, 0) };

    /// <summary>Column/row of the hex next to (x, y) on the <paramref name="look"/> side.</summary>
    public static (int X, int Y) Neighbor(int x, int y, int look)
    {
        var (q, r) = OffsetToAxial(x, y);
        var (dq, dr) = LookDirections[look];
        return AxialToOffset(q + dq, r + dr);
    }

    /// <summary>Fewest 60° turns between two facings.</summary>
    public static int TurnCost(int from, int to)
    {
        var d = Math.Abs(from - to) % 6;
        return Math.Min(d, 6 - d);
    }

    /// <summary>
    /// Cheapest movement from one (hex, facing) to another: turning one side costs 1 and stepping into the
    /// hex ahead costs 1. Breadth-first search over (hex, facing) states ("Movement range" in the guide);
    /// hexes outside the grid or blocked are never entered. Null when unreachable.
    /// </summary>
    public static int? MovementCost(int fromX, int fromY, int fromLook, int toX, int toY, int toLook,
        int columns, int rows, Func<int, int, bool> isBlocked)
    {
        var start = (fromX, fromY, fromLook);
        var target = (toX, toY, toLook);
        var dist = new Dictionary<(int X, int Y, int Look), int> { [start] = 0 };
        var queue = new Queue<(int X, int Y, int Look)>();
        queue.Enqueue(start);
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            var cost = dist[current];
            if (current == target)
                return cost;
            var next = new List<(int X, int Y, int Look)>
            {
                (current.X, current.Y, (current.Look + 5) % 6),
                (current.X, current.Y, (current.Look + 1) % 6)
            };
            var (aheadX, aheadY) = Neighbor(current.X, current.Y, current.Look);
            if (IsInsideGrid(aheadX, aheadY, columns, rows) && !isBlocked(aheadX, aheadY))
                next.Add((aheadX, aheadY, current.Look));
            foreach (var state in next)
            {
                if (dist.ContainsKey(state))
                    continue;
                dist[state] = cost + 1;
                queue.Enqueue(state);
            }
        }
        return null;
    }

    /// <summary>True when the column/row is inside a grid of <paramref name="columns"/> × <paramref name="rows"/>.</summary>
    public static bool IsInsideGrid(int x, int y, int columns, int rows)
    {
        return x >= 0 && x < columns && y >= 0 && y < rows;
    }
}
