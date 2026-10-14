using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class TokenTests
{
    [Theory]
    [InlineData(null, 1)]
    [InlineData(Posture.Standing, 1)]
    [InlineData(Posture.Down, 2)]
    [InlineData(Posture.OutOfCombat, 2)]
    public void SpaceFor_UsesTheDownSizeWhileLying(Posture? posture, int expected)
    {
        new Token { UpSpace = 1, DownSpace = 2 }.SpaceFor(posture).Should().Be(expected);
    }

    [Fact]
    public void SpaceFor_WithoutDownState_KeepsTheStandingSize()
    {
        new Token { UpSpace = 3, DownSpace = null }.SpaceFor(Posture.OutOfCombat).Should().Be(3);
    }

    [Fact]
    public void UpdateModel_SavesAnUploadedModel()
    {
        var token = new Token();

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb");

        token.ModelFile.Should().Be("0123456789abcdef0123456789abcdef.glb");
        token.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void UpdateModel_NullRemovesTheModel()
    {
        var token = new Token { ModelFile = "0123456789abcdef0123456789abcdef.glb" };

        token.UpdateModel(null);

        token.ModelFile.Should().BeNull();
    }

    [Fact]
    public void UpdateModel_SavesTheChosenAnimations()
    {
        var token = new Token();

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb", "clip:Armature|Walk", "roll6");

        token.ModelIdleClip.Should().Be("clip:Armature|Walk");
        token.ModelWalkClip.Should().Be("roll6");
    }

    [Fact]
    public void UpdateModel_SavesTheGuardStance()
    {
        var token = new Token();

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb", "roll6-guard", null);

        token.ModelIdleClip.Should().Be("roll6-guard");
    }

    [Fact]
    public void UpdateModel_WithoutAModelDropsTheChoices()
    {
        var token = new Token
        {
            ModelFile = "0123456789abcdef0123456789abcdef.glb", ModelIdleClip = "none", ModelWalkClip = "none", ModelDownClip = "none",
        };

        token.UpdateModel(null, "none", "none", "none");

        token.ModelIdleClip.Should().BeNull();
        token.ModelWalkClip.Should().BeNull();
        token.ModelDownClip.Should().BeNull();
    }

    [Fact]
    public void UpdateModel_RefusesAnUnknownAnimationChoice()
    {
        var token = new Token();

        var act = () => token.UpdateModel("0123456789abcdef0123456789abcdef.glb", "walk", null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelIdleClip");
    }

    [Fact]
    public void UpdateModel_RefusesAnythingButAModelName()
    {
        var token = new Token();

        var act = () => token.UpdateModel("0123456789abcdef0123456789abcdef.png");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelFile");
    }

    [Theory]
    [InlineData("roll6")]
    [InlineData("none")]
    [InlineData("clip:Armature|Death")]
    public void UpdateModel_SavesTheDeathChoice(string choice)
    {
        var token = new Token();

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb", null, null, choice);

        token.ModelDownClip.Should().Be(choice);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void UpdateModel_DeathIsAutomaticWhenNotChosen(string? choice)
    {
        var token = new Token { ModelDownClip = "none" };

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb", "roll6", "roll6", choice);

        token.ModelDownClip.Should().BeNull();
    }

    [Fact]
    public void UpdateModel_RefusesAnUnknownDeathChoice()
    {
        var token = new Token();

        var act = () => token.UpdateModel("0123456789abcdef0123456789abcdef.glb", null, null, "Roll6");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelDownClip");
    }
}
