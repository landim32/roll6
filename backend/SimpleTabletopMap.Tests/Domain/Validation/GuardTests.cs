using FluentAssertions;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Validation;

namespace SimpleTabletopMap.Tests.Domain.Validation;

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
    [InlineData("simple-tabletop/0123456789abcdef0123456789abcdef.png")]
    [InlineData("../0123456789abcdef0123456789abcdef.png")]
    [InlineData("0123456789abcdef0123456789abcdef.gif")]
    [InlineData("foto.png")]
    public void ImageFileName_RejectsAnythingElse(string fileName)
    {
        var act = () => Guard.ImageFileName(fileName, "image");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("image");
    }
}
