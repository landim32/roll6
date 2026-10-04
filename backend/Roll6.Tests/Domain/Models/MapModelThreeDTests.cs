using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

/// <summary>The 3D view images of a map model (034): the mask (walls) and the background.</summary>
public class MapModelThreeDTests
{
    private const string MASK = "0123456789abcdef0123456789abcdef.png";
    private const string BACKGROUND = "fedcba9876543210fedcba9876543210.jpg";

    [Fact]
    public void UpdateThreeD_KeepsBothImages()
    {
        var mapModel = new MapModel();

        mapModel.UpdateThreeD(MASK, BACKGROUND);

        mapModel.MaskImage.Should().Be(MASK);
        mapModel.BackgroundImage.Should().Be(BACKGROUND);
        mapModel.ChangedAt.Should().BeAfter(DateTime.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public void UpdateThreeD_NullRemovesThem()
    {
        var mapModel = new MapModel();
        mapModel.UpdateThreeD(MASK, BACKGROUND);

        mapModel.UpdateThreeD(null, null);

        mapModel.MaskImage.Should().BeNull();
        mapModel.BackgroundImage.Should().BeNull();
    }

    [Theory]
    [InlineData("mask.gif", null, "maskImage")]
    [InlineData(null, "../background.png", "backgroundImage")]
    public void UpdateThreeD_InvalidFileName_Throws(string? mask, string? background, string field)
    {
        var act = () => new MapModel().UpdateThreeD(mask, background);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Fact]
    public void NewMapModel_HasNeitherImage()
    {
        var mapModel = new MapModel();

        mapModel.MaskImage.Should().BeNull();
        mapModel.BackgroundImage.Should().BeNull();
    }
}
