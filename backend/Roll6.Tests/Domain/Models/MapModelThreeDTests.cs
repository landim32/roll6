using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

/// <summary>The 3D view images of a map model: the mask (walls) and the background (034) and the wall texture (036).</summary>
public class MapModelThreeDTests
{
    private const string MASK = "0123456789abcdef0123456789abcdef.png";
    private const string BACKGROUND = "fedcba9876543210fedcba9876543210.jpg";
    private const string TEXTURE = "00112233445566778899aabbccddeeff.webp";

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
    public void UpdateThreeD_KeepsTheWallTexture()
    {
        var mapModel = new MapModel();

        mapModel.UpdateThreeD(MASK, BACKGROUND, TEXTURE);

        mapModel.WallTextureImage.Should().Be(TEXTURE);
        mapModel.MaskImage.Should().Be(MASK);
        mapModel.BackgroundImage.Should().Be(BACKGROUND);
    }

    [Fact]
    public void UpdateThreeD_WithoutTheTexture_RemovesIt()
    {
        var mapModel = new MapModel();
        mapModel.UpdateThreeD(MASK, BACKGROUND, TEXTURE);

        mapModel.UpdateThreeD(MASK, BACKGROUND, null);

        mapModel.WallTextureImage.Should().BeNull();
        mapModel.MaskImage.Should().Be(MASK);
    }

    [Theory]
    [InlineData("texture.gif")]
    [InlineData("../texture.png")]
    public void UpdateThreeD_InvalidTextureFileName_Throws(string texture)
    {
        var act = () => new MapModel().UpdateThreeD(null, null, texture);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("wallTextureImage");
    }

    [Fact]
    public void NewMapModel_HasNoImages()
    {
        var mapModel = new MapModel();

        mapModel.MaskImage.Should().BeNull();
        mapModel.BackgroundImage.Should().BeNull();
        mapModel.WallTextureImage.Should().BeNull();
    }
}
