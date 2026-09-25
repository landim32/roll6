using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class MapModelLayoutTests
{
    [Fact]
    public void UpdateGrid_WithoutValues_UsesDefault()
    {
        var mapModel = new MapModel();

        mapModel.UpdateGrid(null, null);

        mapModel.GridWidth.Should().Be(20);
        mapModel.GridHeight.Should().Be(20);
    }

    [Theory]
    [InlineData(0, 10, "gridWidth")]
    [InlineData(501, 10, "gridWidth")]
    [InlineData(10, 0, "gridHeight")]
    [InlineData(10, 501, "gridHeight")]
    public void UpdateGrid_OutOfRange_Throws(int width, int height, string field)
    {
        var act = () => new MapModel().UpdateGrid(width, height);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Fact]
    public void UpdateGrid_AcceptsLimits()
    {
        var mapModel = new MapModel();

        mapModel.UpdateGrid(1, 500);

        mapModel.GridWidth.Should().Be(1);
        mapModel.GridHeight.Should().Be(500);
    }

    [Fact]
    public void UpdateImageLayout_WithoutValues_KeepsOriginalSizeAndNoOffset()
    {
        var mapModel = new MapModel();

        mapModel.UpdateImageLayout(null, null, null, null);

        mapModel.ImageWidth.Should().BeNull();
        mapModel.ImageHeight.Should().BeNull();
        mapModel.ImageTop.Should().Be(0);
        mapModel.ImageLeft.Should().Be(0);
    }

    [Theory]
    [InlineData(1600, null, "imageHeight")]
    [InlineData(null, 1400, "imageWidth")]
    public void UpdateImageLayout_OnlyOneDisplaySide_Throws(int? width, int? height, string field)
    {
        var act = () => new MapModel().UpdateImageLayout(width, height, null, null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Theory]
    [InlineData(0, 1400, 0, 0, "imageWidth")]
    [InlineData(20001, 1400, 0, 0, "imageWidth")]
    [InlineData(1600, 0, 0, 0, "imageHeight")]
    [InlineData(1600, 1400, -20001, 0, "imageTop")]
    [InlineData(1600, 1400, 0, 20001, "imageLeft")]
    public void UpdateImageLayout_InvalidValues_Throw(int width, int height, int top, int left, string field)
    {
        var act = () => new MapModel().UpdateImageLayout(width, height, top, left);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Theory]
    [InlineData(-300, -150)] // image moved right/down of the grid origin
    [InlineData(400, 100)]   // image moved left/up
    [InlineData(1400, 1600)] // offset beyond the display size is allowed (image fully shifted)
    public void UpdateImageLayout_AcceptsAnyOffsetInRange(int top, int left)
    {
        var mapModel = new MapModel();

        mapModel.UpdateImageLayout(1600, 1400, top, left);

        mapModel.ImageTop.Should().Be(top);
        mapModel.ImageLeft.Should().Be(left);
    }

    [Fact]
    public void UpdateImageLayout_DoesNotChangeTheGrid()
    {
        var mapModel = new MapModel();
        mapModel.UpdateGrid(10, 8);

        mapModel.UpdateImageLayout(3200, 2800, -50, 120);

        mapModel.GridWidth.Should().Be(10);
        mapModel.GridHeight.Should().Be(8);
    }
}
