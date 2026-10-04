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

    // 033 — walls of a story map (same cases as occupancy.test.ts)
    [Fact]
    public void Wall_BlocksEveryPiece_ButIsNotAPiece()
    {
        var occupancy = Occupancy.Build(new[] { new PieceShape(1, 4, 4, 0, 1) }, new[] { (2, 2) });

        occupancy.IsWall(2, 2).Should().BeTrue();
        occupancy.IsBlocked(2, 2, 1).Should().BeTrue();
        occupancy.IsBlocked(2, 2, null).Should().BeTrue();
        occupancy.PieceAt(2, 2).Should().BeNull();
    }

    [Fact]
    public void Fits_AnyHexOnAWall_IsWall_OutsideWinsOverWall_WallWinsOverOccupied()
    {
        var occupancy = Occupancy.Build(new[] { new PieceShape(1, 5, 5, 0, 1) }, new[] { (2, 2), (5, 4) });

        occupancy.Fits(HexGrid.Footprint(2, 2, 0, 1), 10, 10, null).Should().Be(FitResult.Wall);
        occupancy.Fits(HexGrid.Footprint(2, 3, 0, 7), 10, 10, null).Should().Be(FitResult.Wall);
        occupancy.Fits(HexGrid.Footprint(5, 5, 3, 2), 10, 10, 1).Should().Be(FitResult.Wall);
        occupancy.Fits(HexGrid.Footprint(0, 0, 0, 7), 10, 10, null).Should().Be(FitResult.OutsideGrid);
        occupancy.Fits(HexGrid.Footprint(5, 5, 0, 1), 10, 10, null).Should().Be(FitResult.Occupied);
        occupancy.Fits(HexGrid.Footprint(7, 7, 0, 1), 10, 10, null).Should().Be(FitResult.Ok);
    }

    [Fact]
    public void MovementCost_GoesAroundAWall_AndAPieceOnAWallLeavesIt()
    {
        var occupancy = Occupancy.Build(Array.Empty<PieceShape>(), new[] { (2, 2) });
        bool Blocked(int x, int y) => occupancy.IsBlocked(x, y, null);

        HexGrid.MovementCost(2, 4, 0, 2, 1, 0, 6, 6, (_, _) => false).Should().Be(3);
        HexGrid.MovementCost(2, 4, 0, 2, 1, 0, 6, 6, Blocked).Should().Be(8);
        HexGrid.MovementCost(2, 4, 0, 2, 2, 0, 6, 6, Blocked).Should().BeNull();
        HexGrid.MovementCost(2, 2, 0, 2, 1, 0, 6, 6, Blocked).Should().Be(1);
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
