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
}
