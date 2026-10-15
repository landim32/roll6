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

    [Fact]
    public void FirstFree_EmptyGrid_IsTheMiddle()
    {
        Occupancy.Build(Array.Empty<PieceShape>()).FirstFree(0, 1, 10, 8).Should().Be((5, 4));
        Occupancy.Build(Array.Empty<PieceShape>()).FirstFree(0, 1, 1, 1).Should().Be((0, 0));
    }

    [Fact]
    public void FirstFree_SkipsTakenHexes_NearestFirst()
    {
        // The middle (5, 4) is taken: the nearest free hex, with ties going to the upper rows.
        var occupancy = Occupancy.Build(new[] { new PieceShape(1, 5, 4, 0, 1) });

        var found = occupancy.FirstFree(0, 1, 10, 8);

        found.Should().NotBeNull();
        HexGrid.Footprint(found!.Value.X, found.Value.Y, 0, 1).Should().NotContain((5, 4));
        found.Should().Be((5, 3));
    }

    [Fact]
    public void FirstFree_BigShape_FitsWholeInsideTheGrid()
    {
        var found = Occupancy.Build(Array.Empty<PieceShape>()).FirstFree(0, 7, 10, 8);

        found.Should().NotBeNull();
        foreach (var (x, y) in HexGrid.Footprint(found!.Value.X, found.Value.Y, 0, 7))
            HexGrid.IsInsideGrid(x, y, 10, 8).Should().BeTrue();
    }

    [Fact]
    public void FirstFree_FullGrid_IsNull()
    {
        var pieces = new List<PieceShape>();
        for (var x = 0; x < 2; x++) for (var y = 0; y < 2; y++) pieces.Add(new PieceShape(pieces.Count + 1, x, y, 0, 1));

        Occupancy.Build(pieces).FirstFree(0, 1, 2, 2).Should().BeNull();
        // A 7-hex shape never fits a 2 × 2 grid.
        Occupancy.Build(Array.Empty<PieceShape>()).FirstFree(0, 7, 2, 2).Should().BeNull();
    }

    [Fact]
    public void Overlaps_NoneWhenEveryHexHasOnePiece()
    {
        Occupancy.Build(new[] { new PieceShape(1, 1, 1, 0, 1), new PieceShape(2, 3, 1, 0, 1) }).Overlaps().Should().BeEmpty();
    }

    [Fact]
    public void Overlaps_GroupsThePiecesOfAHex()
    {
        var groups = Occupancy.Build(new[]
        {
            new PieceShape(1, 2, 2, 0, 1), new PieceShape(2, 2, 2, 0, 1), new PieceShape(3, 2, 2, 0, 1), new PieceShape(4, 6, 6, 0, 1)
        }).Overlaps();

        groups.Should().HaveCount(1);
        groups[0].Should().Equal(1, 2, 3);
    }

    [Fact]
    public void Overlaps_CountsTheWholeShape()
    {
        // A 2-hex piece at (4, 4) facing up also takes (4, 5), where piece 2 stands.
        var groups = Occupancy.Build(new[] { new PieceShape(1, 4, 4, 0, 2), new PieceShape(2, 4, 5, 0, 1) }).Overlaps();

        groups.Should().ContainSingle().Which.Should().BeEquivalentTo(new long[] { 1, 2 });
    }

    [Fact]
    public void Overlaps_SeparatePairsAndChains()
    {
        var pairs = Occupancy.Build(new[]
        {
            new PieceShape(1, 1, 1, 0, 1), new PieceShape(2, 1, 1, 0, 1), new PieceShape(3, 6, 6, 0, 1), new PieceShape(4, 6, 6, 0, 1)
        }).Overlaps();
        pairs.Should().HaveCount(2);
        pairs[0].Should().Equal(1, 2);
        pairs[1].Should().Equal(3, 4);

        // A meets B on (4, 4); B (2 hexes) meets C on (4, 5): one group.
        var chain = Occupancy.Build(new[]
        {
            new PieceShape(1, 4, 4, 0, 1), new PieceShape(2, 4, 4, 0, 2), new PieceShape(3, 4, 5, 0, 1)
        }).Overlaps();
        chain.Should().ContainSingle().Which.Should().BeEquivalentTo(new long[] { 1, 2, 3 });
    }
}
