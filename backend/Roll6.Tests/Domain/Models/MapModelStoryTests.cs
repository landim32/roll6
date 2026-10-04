using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

/// <summary>Kind, walls and sky of a story map (033).</summary>
public class MapModelStoryTests
{
    private const string SKY = "0123456789abcdef0123456789abcdef.jpg";

    private static MapModel Grid(int columns = 10, int rows = 8)
    {
        var mapModel = new MapModel();
        mapModel.UpdateGrid(columns, rows);
        return mapModel;
    }

    [Fact]
    public void UpdateStory_WithoutKind_IsBattle()
    {
        var mapModel = Grid();

        mapModel.UpdateStory(null, null, null);

        mapModel.Kind.Should().Be(MapKind.Battle);
        mapModel.Walls.Should().BeNull();
        mapModel.SkyImage.Should().BeNull();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    public void UpdateStory_UnknownKind_Throws(int kind)
    {
        var act = () => Grid().UpdateStory(kind, null, null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("kind");
    }

    [Fact]
    public void UpdateStory_WallNotAPair_Throws()
    {
        var act = () => Grid().UpdateStory(2, new[] { new[] { 1, 2, 3 } }, null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("walls");
    }

    [Fact]
    public void UpdateStory_DropsDuplicatesAndCellsOutsideTheGrid_AndSortsByRowThenColumn()
    {
        var mapModel = Grid(10, 8);

        mapModel.UpdateStory(2, new[]
        {
            new[] { 5, 3 }, new[] { 1, 3 }, new[] { 2, 0 }, new[] { 5, 3 }, new[] { 10, 0 }, new[] { 0, 8 }, new[] { -1, 2 }
        }, null);

        mapModel.Walls!.Select(w => (w[0], w[1])).Should().Equal((2, 0), (1, 3), (5, 3));
    }

    [Fact]
    public void UpdateStory_EmptyWalls_IsNull()
    {
        var mapModel = Grid();

        mapModel.UpdateStory(2, Array.Empty<int[]>(), null);

        mapModel.Walls.Should().BeNull();
        mapModel.ActiveWalls().Should().BeEmpty();
    }

    [Fact]
    public void UpdateStory_BackToBattle_KeepsWallsAndSky_ButNoneIsActive()
    {
        var mapModel = Grid();
        mapModel.UpdateStory(2, new[] { new[] { 1, 1 } }, SKY);

        mapModel.UpdateStory(1, new[] { new[] { 1, 1 } }, SKY);

        mapModel.Kind.Should().Be(MapKind.Battle);
        mapModel.Walls.Should().HaveCount(1);
        mapModel.SkyImage.Should().Be(SKY);
        mapModel.ActiveWalls().Should().BeEmpty();
    }

    [Fact]
    public void ActiveWalls_OfAStoryMap_AreItsWalls()
    {
        var mapModel = Grid();

        mapModel.UpdateStory(2, new[] { new[] { 3, 4 }, new[] { 0, 0 } }, null);

        mapModel.ActiveWalls().Should().Equal((0, 0), (3, 4));
    }

    [Fact]
    public void UpdateStory_InvalidSkyImage_Throws()
    {
        var act = () => Grid().UpdateStory(2, null, "sky.gif");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("skyImage");
    }
}
