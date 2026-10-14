using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class AnimationTests
{
    [Fact]
    public void Create_KeepsTheValues()
    {
        var animation = Animation.Create(3, "  Aceno  ", 1, 1.5, true);

        animation.UserId.Should().Be(3);
        animation.Name.Should().Be("Aceno");
        animation.AnimationType.Should().Be(AnimationType.Idle);
        animation.Duration.Should().Be(1.5);
        animation.Loop.Should().BeTrue();
        animation.CreatedAt.Should().Be(animation.UpdatedAt);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    public void Create_WithoutName_Throws(string? name)
    {
        var act = () => Animation.Create(3, name, 1, 1, true);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("name");
    }

    [Fact]
    public void Create_NameOver100_Throws()
    {
        var act = () => Animation.Create(3, new string('a', 101), 1, 1, true);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("name");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(8)]
    public void ChangeType_OutsideOneToSeven_Throws(int type)
    {
        var act = () => Animation.Create(3, "Aceno", type, 1, true);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("type");
    }

    [Fact]
    public void AttachFile_OnlyLibraryNames()
    {
        var animation = Animation.Create(3, "Aceno", 1, 1, true);

        animation.AttachFile("0123456789abcdef0123456789abcdef.json");
        animation.FileName.Should().Be("0123456789abcdef0123456789abcdef.json");
        var act = () => animation.AttachFile("x.json");
        act.Should().Throw<DomainValidationException>();
    }
}
