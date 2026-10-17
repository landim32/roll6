using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Weapons;

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

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb", "clip:Armature|Walk", "animation:4");

        token.ModelIdleClip.Should().Be("clip:Armature|Walk");
        token.ModelWalkClip.Should().Be("animation:4");
    }

    [Theory]
    [InlineData("roll6")]
    [InlineData("roll6-guard")]
    public void UpdateModel_RefusesRoll6sFormerOwnAnimations(string choice)
    {
        var token = new Token();

        var act = () => token.UpdateModel("0123456789abcdef0123456789abcdef.glb", choice, null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelIdleClip");
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
    [InlineData("animation:5")]
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

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb", "none", "none", choice);

        token.ModelDownClip.Should().BeNull();
    }

    [Fact]
    public void UpdateModel_RefusesAnUnknownDeathChoice()
    {
        var token = new Token();

        var act = () => token.UpdateModel("0123456789abcdef0123456789abcdef.glb", null, null, "Roll6");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelDownClip");
    }

    [Fact]
    public void UpdateModel_KeepsTheSizeOfAModel()
    {
        var token = new Token();

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb", scale: 150);

        token.ModelScale.Should().Be(150);
    }

    [Fact]
    public void UpdateModel_WithoutAModel_TheSizeIsTheDefault()
    {
        var token = new Token { ModelFile = "0123456789abcdef0123456789abcdef.glb", ModelScale = 200 };

        token.UpdateModel(null, scale: 250);

        token.ModelScale.Should().Be(100);
    }

    [Fact]
    public void UpdateModel_OmittedSize_IsTheDefault()
    {
        var token = new Token { ModelScale = 200 };

        token.UpdateModel("0123456789abcdef0123456789abcdef.glb");

        token.ModelScale.Should().Be(100);
    }

    [Fact]
    public void UpdateModel_InvalidSize_IsRefused()
    {
        var act = () => new Token().UpdateModel("0123456789abcdef0123456789abcdef.glb", scale: 42);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelScale");
    }
}

public class TokenWeaponsTests
{
    private const string MODEL = "0123456789abcdef0123456789abcdef.glb";

    private static Token WithModel()
    {
        var token = new Token();
        token.UpdateModel(MODEL);
        return token;
    }

    [Fact]
    public void UpdateWeapons_SavesBothHandsAndTheirGrips()
    {
        var token = WithModel();

        token.UpdateWeapons(new TokenHand(7, new WeaponGrip { Rz = 90, Scale = 120 }), new TokenHand(8, null));

        token.RightWeaponId.Should().Be(7);
        WeaponGrip.FromJson(token.RightWeaponGrip).Should().Be(new WeaponGrip { Rz = 90, Scale = 120 });
        token.LeftWeaponId.Should().Be(8);
        token.LeftWeaponGrip.Should().BeNull();
    }

    [Fact]
    public void UpdateWeapons_TheSameWeaponMayBeInBothHands()
    {
        var token = WithModel();

        token.UpdateWeapons(new TokenHand(7, null), new TokenHand(7, null));

        token.RightWeaponId.Should().Be(7);
        token.LeftWeaponId.Should().Be(7);
    }

    [Fact]
    public void UpdateWeapons_NullEmptiesTheHand()
    {
        var token = WithModel();
        token.UpdateWeapons(new TokenHand(7, new WeaponGrip { Scale = 50 }), new TokenHand(8, null));

        token.UpdateWeapons(null, new TokenHand(8, null));

        token.RightWeaponId.Should().BeNull();
        token.RightWeaponGrip.Should().BeNull();
        token.LeftWeaponId.Should().Be(8);
    }

    [Fact]
    public void UpdateWeapons_WithoutAModelEmptiesBothHands()
    {
        var token = new Token();
        token.UpdateModel(null);

        token.UpdateWeapons(new TokenHand(7, new WeaponGrip { Scale = 50 }), new TokenHand(8, null));

        token.RightWeaponId.Should().BeNull();
        token.LeftWeaponId.Should().BeNull();
        token.RightWeaponGrip.Should().BeNull();
    }

    [Fact]
    public void UpdateWeapons_GripOutOfRange_ThrowsKeyedByHand()
    {
        var token = WithModel();

        var act = () => token.UpdateWeapons(null, new TokenHand(8, new WeaponGrip { Scale = 1000 }));

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("leftWeapon.grip.scale");
    }
}
