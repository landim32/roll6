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

    /// <summary>Sizes a token may take, in hexes (031).</summary>
    public static readonly IReadOnlyList<int> ALLOWED_SPACES = new[] { 1, 2, 3, 7, 10 };

    public static bool IsAllowedSpace(int space) => ALLOWED_SPACES.Contains(space);

    /// <summary>
    /// Hexes taken by a piece of <paramref name="space"/> hexes at (x, y) facing <paramref name="look"/> (031), the
    /// position first. Computed in axial around the position c, with the facing d and e = the next side clockwise:
    /// 1 = c; 2 = c and the hex behind (c − d); 3 = a line along the facing, c in the middle (c, c + d, c − d);
    /// 7 = c and its six neighbors; 10 = a line of 4 along the facing with c second from the front
    /// (c, c + d, c − d, c − 2d) plus a line of 3 on each side, each hex touching two of the middle line
    /// (c + e, c − d + e, c − 2d + e and c + d − e, c − e, c − d − e). Mirror of footprint in the frontend's hexGrid.ts.
    /// </summary>
    public static IReadOnlyList<(int X, int Y)> Footprint(int x, int y, int look, int space)
    {
        if (!IsAllowedSpace(space))
            throw new ArgumentOutOfRangeException(nameof(space), space, "The size must be 1, 2, 3, 7 or 10 hexes.");
        var (q, r) = OffsetToAxial(x, y);
        var (dq, dr) = LookDirections[((look % 6) + 6) % 6];
        var (eq, er) = LookDirections[(((look + 1) % 6) + 6) % 6];
        (int Q, int R) At(int forward, int side) => (q + forward * dq + side * eq, r + forward * dr + side * er);

        (int Q, int R)[] axial = space switch
        {
            1 => new[] { At(0, 0) },
            2 => new[] { At(0, 0), At(-1, 0) },
            3 => new[] { At(0, 0), At(1, 0), At(-1, 0) },
            7 => new[] { At(0, 0) }.Concat(LookDirections.Select(n => (q + n.Q, r + n.R))).ToArray(),
            _ => new[]
            {
                At(0, 0), At(1, 0), At(-1, 0), At(-2, 0),
                At(0, 1), At(-1, 1), At(-2, 1),
                At(1, -1), At(0, -1), At(-1, -1)
            }
        };
        return axial.Select(a => AxialToOffset(a.Q, a.R)).ToList();
    }

    /// <summary>Whether turning in place changes the hexes taken (the 1- and 7-hex shapes never change).</summary>
    public static bool TurnChangesFootprint(int space) => space is 2 or 3 or 10;

    /// <summary>Fewest 60° turns between two facings.</summary>
    public static int TurnCost(int from, int to)
    {
        var d = Math.Abs(from - to) % 6;
        return Math.Min(d, 6 - d);
    }

    /// <summary>
    /// Cheapest movement from one (hex, facing) to another: turning one side costs 1 and stepping into the
    /// hex ahead costs 1. Breadth-first search over (hex, facing) states ("Movement range" in the guide);
    /// a state is entered only when the whole shape of a piece of <paramref name="space"/> hexes fits there — inside
    /// the grid and on no blocked hex (031). The start state is always accepted (a piece may overlap another one after
    /// lying down). Null when unreachable.
    /// </summary>
    public static int? MovementCost(int fromX, int fromY, int fromLook, int toX, int toY, int toLook,
        int columns, int rows, Func<int, int, bool> isBlocked, int space = 1)
    {
        bool Fits(int x, int y, int look) =>
            Footprint(x, y, look, space).All(h => IsInsideGrid(h.X, h.Y, columns, rows) && !isBlocked(h.X, h.Y));

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
            var next = new List<(int X, int Y, int Look)>();
            foreach (var turned in new[] { (current.Look + 5) % 6, (current.Look + 1) % 6 })
            {
                if (!TurnChangesFootprint(space) || Fits(current.X, current.Y, turned))
                    next.Add((current.X, current.Y, turned));
            }
            var (aheadX, aheadY) = Neighbor(current.X, current.Y, current.Look);
            if (Fits(aheadX, aheadY, current.Look))
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
