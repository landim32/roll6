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
    [InlineData("none")]
    [InlineData("clip:Walk")]
    [InlineData("clip:Armature|mixamo.com|Layer0")]
    [InlineData("animation:5")]
    [InlineData("animation:12345")]
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
    [InlineData("animation:")]
    [InlineData("animation:abc")]
    [InlineData("animation:0")]
    [InlineData("animation:-3")]
    public void ModelClip_RejectsAnythingElse(string choice)
    {
        var act = () => Guard.ModelClip(choice, "modelWalkClip");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelWalkClip");
    }

    [Theory]
    [InlineData("0123456789abcdef0123456789abcdef.json", true)]
    [InlineData("0123456789abcdef0123456789abcdef.glb", false)]
    [InlineData("../x.json", false)]
    [InlineData("0123456789ABCDEF0123456789abcdef.json", false)]
    public void AnimationFileName_OnlyLibraryNames(string fileName, bool valid)
    {
        Guard.IsAnimationFileName(fileName).Should().Be(valid);
        var act = () => Guard.AnimationFileName(fileName, "fileName");
        if (valid)
            act.Should().NotThrow();
        else
            act.Should().Throw<DomainValidationException>();
    }

    [Theory]
    [InlineData(25)]
    [InlineData(100)]
    [InlineData(135)]
    [InlineData(400)]
    public void ModelScale_AcceptsPercentagesInStepsOfFive(int scale)
    {
        Guard.ModelScale(scale, "modelScale").Should().Be(scale);
    }

    [Fact]
    public void ModelScale_NullIsTheDefault()
    {
        Guard.ModelScale(null, "modelScale").Should().Be(100);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(20)]
    [InlineData(42)]
    [InlineData(405)]
    public void ModelScale_RefusesOutsideTheRangeOrTheStep(int scale)
    {
        var act = () => Guard.ModelScale(scale, "modelScale");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelScale");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(90)]
    [InlineData(180)]
    [InlineData(270)]
    [InlineData(17)]
    [InlineData(359)]
    public void ModelFront_AcceptsWholeDegrees(int front)
    {
        Guard.ModelFront(front, "modelFront").Should().Be(front);
    }

    [Fact]
    public void ModelFront_NullIsPlusZ()
    {
        Guard.ModelFront(null, "modelFront").Should().Be(0);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-90)]
    [InlineData(360)]
    public void ModelFront_RefusesOtherAngles(int front)
    {
        var act = () => Guard.ModelFront(front, "modelFront");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelFront");
    }
}
