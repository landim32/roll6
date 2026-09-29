using FluentAssertions;
using Roll6.Domain.Grid;

namespace Roll6.Tests.Domain.Grid;

public class OccupancyTests
{
    [Fact]
    public void PieceAt_AnyHexOfTheShape()
    {
        var occupancy = Occupancy.Build(new[] { new PieceShape(1, 4, 4, 0, 7), new PieceShape(2, 8, 2, 0, 1) });

        foreach (var (x, y) in HexGrid.Footprint(4, 4, 0, 7))
            occupancy.PieceAt(x, y).Should().Be(1);
        occupancy.PieceAt(8, 2).Should().Be(2);
        occupancy.PieceAt(0, 0).Should().BeNull();
    }

    [Fact]
    public void Fits_IgnoresThePieceItself()
    {
        var occupancy = Occupancy.Build(new[] { new PieceShape(1, 4, 4, 0, 2), new PieceShape(2, 4, 2, 0, 1) });

        // Moving piece 1 one hex up: its new shape (4, 3) + (4, 4) overlaps only itself.
        occupancy.Fits(HexGrid.Footprint(4, 3, 0, 2), 10, 10, 1).Should().Be(FitResult.Ok);
        // Two hexes up it would take (4, 2), where piece 2 is.
        occupancy.Fits(HexGrid.Footprint(4, 2, 0, 2), 10, 10, 1).Should().Be(FitResult.Occupied);
        occupancy.Fits(HexGrid.Footprint(0, 0, 3, 2), 10, 10, 1).Should().Be(FitResult.OutsideGrid);
    }

    [Fact]
    public void OverlappingPieces_BothBlockTheHex()
    {
        var occupancy = Occupancy.Build(new[] { new PieceShape(1, 4, 4, 0, 2), new PieceShape(2, 4, 5, 0, 1) });

        occupancy.PieceAt(4, 5).Should().Be(1);
        occupancy.IsBlocked(4, 5, 1).Should().BeTrue();
        occupancy.IsBlocked(4, 5, 2).Should().BeTrue();
        occupancy.IsBlocked(4, 4, 1).Should().BeFalse();
    }
}
