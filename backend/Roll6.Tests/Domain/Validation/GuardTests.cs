using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Tests.Domain.Validation;

public class GuardTests
{
    [Theory]
    [InlineData("0123456789abcdef0123456789abcdef.png")]
    [InlineData("0123456789abcdef0123456789abcdef.jpg")]
    [InlineData("0123456789abcdef0123456789abcdef.webp")]
    public void ImageFileName_AcceptsUploadedFileNames(string fileName)
    {
        Guard.ImageFileName(fileName, "image").Should().Be(fileName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ImageFileName_EmptyMeansNoImage(string? fileName)
    {
        Guard.ImageFileName(fileName, "image").Should().BeNull();
    }

    [Theory]
    [InlineData("roll6/0123456789abcdef0123456789abcdef.png")]
    [InlineData("../0123456789abcdef0123456789abcdef.png")]
    [InlineData("0123456789abcdef0123456789abcdef.gif")]
    [InlineData("foto.png")]
    public void ImageFileName_RejectsAnythingElse(string fileName)
    {
        var act = () => Guard.ImageFileName(fileName, "image");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("image");
    }

    [Theory]
    [InlineData("0123456789abcdef0123456789abcdef.glb")]
    public void ModelFileName_AcceptsUploadedModelNames(string fileName)
    {
        Guard.ModelFileName(fileName, "modelFile").Should().Be(fileName);
        Guard.IsModelFileName(fileName).Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void ModelFileName_EmptyMeansNoModel(string? fileName)
    {
        Guard.ModelFileName(fileName, "modelFile").Should().BeNull();
    }

    [Theory]
    [InlineData("0123456789abcdef0123456789abcdef.png")]
    [InlineData("0123456789abcdef0123456789abcdef.gltf")]
    [InlineData("../0123456789abcdef0123456789abcdef.glb")]
    [InlineData("orc.glb")]
    public void ModelFileName_RejectsAnythingElse(string fileName)
    {
        var act = () => Guard.ModelFileName(fileName, "modelFile");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelFile");
        Guard.IsModelFileName(fileName).Should().BeFalse();
    }

    [Theory]
    [InlineData("roll6")]
    [InlineData("roll6-guard")]
    [InlineData("none")]
    [InlineData("clip:Walk")]
    [InlineData("clip:Armature|mixamo.com|Layer0")]
    public void ModelClip_AcceptsTheKnownChoices(string choice)
    {
        Guard.ModelClip(choice, "modelIdleClip").Should().Be(choice);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void ModelClip_EmptyMeansAutomatic(string? choice)
    {
        Guard.ModelClip(choice, "modelIdleClip").Should().BeNull();
    }

    [Theory]
    [InlineData("auto")]
    [InlineData("Roll6")]
    [InlineData("Roll6-Guard")]
    [InlineData("guard")]
    [InlineData("clip:")]
    [InlineData("Walk")]
    public void ModelClip_RejectsAnythingElse(string choice)
    {
        var act = () => Guard.ModelClip(choice, "modelWalkClip");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelWalkClip");
    }
}
