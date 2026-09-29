using FluentAssertions;
using Roll6.Domain.Grid;

namespace Roll6.Tests.Domain.Grid;

/// <summary>
/// Reference values for the hex grid module. The frontend module (frontend/src/lib/hexGrid.ts) must
/// produce the same numbers.
/// </summary>
public class HexGridTests
{
    [Fact]
    public void HexSize_IsFixedAt40()
    {
        HexGrid.HEX_SIZE.Should().Be(40);
    }

    [Theory]
    [InlineData(0, 0, 0, 0)]
    [InlineData(3, 1, 3, 2)]
    [InlineData(2, -1, 2, 0)]
    [InlineData(1, 0, 1, 0)]
    [InlineData(-3, 2, -3, 0)]
    public void AxialToOffset_MatchesReferenceValues(int q, int r, int x, int y)
    {
        HexGrid.AxialToOffset(q, r).Should().Be((x, y));
        HexGrid.OffsetToAxial(x, y).Should().Be((q, r));
    }

    [Fact]
    public void OffsetAndAxial_RoundTrip()
    {
        for (var x = -12; x <= 12; x++)
        for (var y = -12; y <= 12; y++)
        {
            var (q, r) = HexGrid.OffsetToAxial(x, y);
            HexGrid.AxialToOffset(q, r).Should().Be((x, y));
        }
    }

    [Fact]
    public void OffsetToAxial_OddColumnNeighborsBelowAreAdjacent()
    {
        // In "odd-q", cell (1, 0) sits half a hex below (0, 0) and (0, 1): all three are neighbors.
        static int Distance((int Q, int R) a, (int Q, int R) b) =>
            (Math.Abs(a.Q - b.Q) + Math.Abs(a.R - b.R) + Math.Abs(a.Q + a.R - b.Q - b.R)) / 2;

        Distance(HexGrid.OffsetToAxial(0, 0), HexGrid.OffsetToAxial(1, 0)).Should().Be(1);
        Distance(HexGrid.OffsetToAxial(0, 1), HexGrid.OffsetToAxial(1, 0)).Should().Be(1);
        Distance(HexGrid.OffsetToAxial(0, 0), HexGrid.OffsetToAxial(2, 0)).Should().Be(2);
    }

    [Fact]
    public void PixelToHex_CenterOfEveryHex_ReturnsTheHex()
    {
        const double size = HexGrid.HEX_SIZE;
        for (var x = 0; x < 5; x++)
        for (var y = 0; y < 4; y++)
        {
            var cx = size + 1.5 * size * x;
            var cy = Math.Sqrt(3) / 2 * size + Math.Sqrt(3) * size * y + (x % 2 == 1 ? Math.Sqrt(3) / 2 * size : 0);
            HexGrid.PixelToHex(cx, cy, size).Should().Be((x, y));
            // Near the flat sides (0,8·size left/right of the center) it is still the same hex.
            HexGrid.PixelToHex(cx + 0.8 * size, cy, size).Should().Be((x, y));
            HexGrid.PixelToHex(cx - 0.8 * size, cy, size).Should().Be((x, y));
        }
    }

    /// <summary>Same points as frontend/src/lib/hexGrid.test.ts.</summary>
    [Theory]
    [InlineData(40, 34.64, 0, 0)]
    [InlineData(100, 69.28, 1, 0)]
    [InlineData(160, 103.92, 2, 1)]
    [InlineData(1, 1, -1, -1)]
    [InlineData(100, 5, 1, -1)]
    public void PixelToHex_ReferencePoints(double px, double py, int x, int y)
    {
        HexGrid.PixelToHex(px, py, HexGrid.HEX_SIZE).Should().Be((x, y));
    }

    [Theory]
    [InlineData(0.2, 0.2, 0, 0)]
    [InlineData(0.6, 0.3, 1, 0)]
    [InlineData(0.4, 0.4, 0, 1)]
    [InlineData(-0.6, 0.1, -1, 0)]
    public void HexRound_FixesTheComponentWithTheLargestError(double q, double r, int expectedQ, int expectedR)
    {
        HexGrid.HexRound(q, r).Should().Be((expectedQ, expectedR));
    }

    [Theory]
    [InlineData(0, 0, true)]
    [InlineData(4, 3, true)]
    [InlineData(5, 0, false)]
    [InlineData(0, 4, false)]
    [InlineData(-1, 0, false)]
    public void IsInsideGrid_ChecksColumnsAndRows(int x, int y, bool inside)
    {
        HexGrid.IsInsideGrid(x, y, 5, 4).Should().Be(inside);
    }

    /// <summary>Same cases as frontend/src/lib/hexGrid.test.ts ("movement (steps + turns)").</summary>
    [Theory]
    [InlineData(2, 2, 0, 0)]
    [InlineData(2, 1, 0, 1)]
    [InlineData(2, 2, 3, 3)]
    [InlineData(3, 1, 1, 2)]
    [InlineData(2, 3, 3, 4)]
    [InlineData(2, 0, 0, 2)]
    public void MovementCost_ReferenceCases(int x, int y, int look, int cost)
    {
        HexGrid.MovementCost(2, 2, 0, x, y, look, 5, 5, (_, _) => false).Should().Be(cost);
    }

    [Fact]
    public void MovementCost_WalksAroundBlockedHexes()
    {
        static bool Blocked(int x, int y) => x == 2 && y == 1;

        HexGrid.MovementCost(2, 2, 0, 2, 0, 0, 5, 5, Blocked).Should().BeGreaterThan(2);
        HexGrid.MovementCost(2, 2, 0, 2, 1, 0, 5, 5, Blocked).Should().BeNull();
        HexGrid.MovementCost(2, 2, 0, 5, 0, 0, 5, 5, Blocked).Should().BeNull();
    }

    [Fact]
    public void Neighbor_EachSideFromEvenAndOddColumns()
    {
        Enumerable.Range(0, 6).Select(look => HexGrid.Neighbor(2, 2, look)).Should().Equal(
            (2, 1), (3, 1), (3, 2), (2, 3), (1, 2), (1, 1));
        Enumerable.Range(0, 6).Select(look => HexGrid.Neighbor(1, 1, look)).Should().Equal(
            (1, 0), (2, 1), (2, 2), (1, 2), (0, 2), (0, 1));
    }

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(0, 1, 1)]
    [InlineData(0, 5, 1)]
    [InlineData(1, 4, 3)]
    [InlineData(5, 2, 3)]
    public void TurnCost_FewestTurns(int from, int to, int cost)
    {
        HexGrid.TurnCost(from, to).Should().Be(cost);
    }

    // ---- 031: piece shapes (the frontend's hexGrid.test.ts pins the same cases) ----

    [Theory]
    [InlineData(4, 4, 0, 1, "4,4")]
    [InlineData(4, 4, 3, 7, "4,4;4,3;5,3;5,4;4,5;3,4;3,3")]
    [InlineData(4, 4, 0, 2, "4,4;4,5")]
    [InlineData(4, 4, 1, 2, "4,4;3,4")]
    [InlineData(4, 4, 2, 2, "4,4;3,3")]
    [InlineData(4, 4, 3, 2, "4,4;4,3")]
    [InlineData(4, 4, 4, 2, "4,4;5,3")]
    [InlineData(4, 4, 5, 2, "4,4;5,4")]
    [InlineData(4, 4, 0, 3, "4,4;4,3;4,5")]
    [InlineData(4, 4, 1, 3, "4,4;5,3;3,4")]
    [InlineData(4, 4, 2, 3, "4,4;5,4;3,3")]
    [InlineData(4, 4, 3, 3, "4,4;4,5;4,3")]
    [InlineData(4, 4, 4, 3, "4,4;3,4;5,3")]
    [InlineData(4, 4, 5, 3, "4,4;3,3;5,4")]
    [InlineData(4, 4, 0, 10, "4,4;4,3;4,5;4,6;5,3;5,4;5,5;3,3;3,4;3,5")]
    [InlineData(4, 4, 1, 10, "4,4;5,3;3,4;2,5;5,4;4,5;3,5;4,3;3,3;2,4")]
    [InlineData(4, 4, 2, 10, "4,4;5,4;3,3;2,3;4,5;3,4;2,4;5,3;4,3;3,2")]
    [InlineData(4, 4, 3, 10, "4,4;4,5;4,3;4,2;3,4;3,3;3,2;5,4;5,3;5,2")]
    [InlineData(4, 4, 4, 10, "4,4;3,4;5,3;6,3;3,3;4,3;5,2;4,5;5,4;6,4")]
    [InlineData(4, 4, 5, 10, "4,4;3,3;5,4;6,5;4,3;5,3;6,4;3,4;4,5;5,5")]
    [InlineData(5, 4, 0, 1, "5,4")]
    [InlineData(5, 4, 3, 7, "5,4;5,3;6,4;6,5;5,5;4,5;4,4")]
    [InlineData(5, 4, 0, 2, "5,4;5,5")]
    [InlineData(5, 4, 1, 2, "5,4;4,5")]
    [InlineData(5, 4, 2, 2, "5,4;4,4")]
    [InlineData(5, 4, 3, 2, "5,4;5,3")]
    [InlineData(5, 4, 4, 2, "5,4;6,4")]
    [InlineData(5, 4, 5, 2, "5,4;6,5")]
    [InlineData(5, 4, 0, 3, "5,4;5,3;5,5")]
    [InlineData(5, 4, 1, 3, "5,4;6,4;4,5")]
    [InlineData(5, 4, 2, 3, "5,4;6,5;4,4")]
    [InlineData(5, 4, 3, 3, "5,4;5,5;5,3")]
    [InlineData(5, 4, 4, 3, "5,4;4,5;6,4")]
    [InlineData(5, 4, 5, 3, "5,4;4,4;6,5")]
    [InlineData(5, 4, 0, 10, "5,4;5,3;5,5;5,6;6,4;6,5;6,6;4,4;4,5;4,6")]
    [InlineData(5, 4, 1, 10, "5,4;6,4;4,5;3,5;6,5;5,5;4,6;5,3;4,4;3,4")]
    [InlineData(5, 4, 2, 10, "5,4;6,5;4,4;3,3;5,5;4,5;3,4;6,4;5,3;4,3")]
    [InlineData(5, 4, 3, 10, "5,4;5,5;5,3;5,2;4,5;4,4;4,3;6,5;6,4;6,3")]
    [InlineData(5, 4, 4, 10, "5,4;4,5;6,4;7,3;4,4;5,3;6,3;5,5;6,5;7,4")]
    [InlineData(5, 4, 5, 10, "5,4;4,4;6,5;7,5;5,3;6,4;7,4;4,5;5,5;6,6")]
    public void Footprint_MatchesReferenceValues(int x, int y, int look, int space, string expected)
    {
        var hexes = expected.Split(';').Select(h => h.Split(',')).Select(p => (int.Parse(p[0]), int.Parse(p[1])));

        HexGrid.Footprint(x, y, look, space).Should().Equal(hexes);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    [InlineData(5)]
    public void Footprint_OtherSizes_Throw(int space)
    {
        var act = () => HexGrid.Footprint(0, 0, 0, space);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void Footprint_TenHexes_IsSymmetricAndConnected()
    {
        var hexes = HexGrid.Footprint(4, 4, 0, 10);

        hexes.Should().OnlyHaveUniqueItems().And.HaveCount(10);
        // Each side hex touches two hexes of the middle line.
        foreach (var side in hexes.Skip(4))
            hexes.Take(4).Count(m => Enumerable.Range(0, 6).Any(look => HexGrid.Neighbor(side.X, side.Y, look) == m)).Should().Be(2);
    }

    [Fact]
    public void MovementCost_BigPiece_NeedsTheWholeShapeFree()
    {
        // A 2-hex piece at (4, 4) looking up takes (4, 5) too; turning right would take (3, 4).
        var blocked = new HashSet<(int, int)> { (3, 4) };

        var cost = HexGrid.MovementCost(4, 4, 0, 4, 4, 1, 10, 10, (x, y) => blocked.Contains((x, y)), space: 2);

        cost.Should().NotBe(1);
        HexGrid.MovementCost(4, 4, 0, 4, 4, 1, 10, 10, (_, _) => false, space: 2).Should().Be(1);
    }

    [Fact]
    public void MovementCost_BigPiece_StaysInsideTheGrid()
    {
        // Facing down at the top edge: the hex behind is outside, but stepping ahead brings it in.
        HexGrid.MovementCost(0, 0, 3, 0, 1, 3, 10, 10, (_, _) => false, space: 2).Should().Be(1);
        // A 3-hex line in column 0 can't turn: every other facing puts one end outside the grid (column −1).
        HexGrid.MovementCost(0, 1, 3, 0, 1, 0, 10, 10, (_, _) => false, space: 3).Should().BeNull();
    }

    [Fact]
    public void MovementCost_OverlappingStart_MayStillMove()
    {
        var blocked = new HashSet<(int, int)> { (4, 5) };

        HexGrid.MovementCost(4, 4, 0, 4, 3, 0, 10, 10, (x, y) => blocked.Contains((x, y)), space: 2).Should().Be(1);
    }
}
