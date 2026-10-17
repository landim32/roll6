using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Weapons;

namespace Roll6.Tests.Domain.Weapons;

public class WeaponGripTests
{
    [Fact]
    public void Default_IsCenteredAtFullSize()
    {
        WeaponGrip.Default.Should().Be(new WeaponGrip { X = 0, Y = 0, Z = 0, Rx = 0, Ry = 0, Rz = 0, Scale = 100 });
        WeaponGrip.Default.Validate("rightWeapon").Should().Be(WeaponGrip.Default);
    }

    [Fact]
    public void Validate_AcceptsTheLimits()
    {
        var grip = new WeaponGrip { X = -0.5, Y = 0.5, Z = 0.25, Rx = -180, Ry = 180, Rz = 90, Scale = 10 };
        grip.Validate("leftWeapon").Should().Be(grip);
        (grip with { Scale = 400 }).Validate("leftWeapon").Should().NotBeNull();
    }

    [Theory]
    [InlineData("x", 0.51, 0, 100)]
    [InlineData("y", -0.6, 0, 100)]
    [InlineData("rx", 0, 181, 100)]
    [InlineData("scale", 0, 0, 5)]
    [InlineData("scale", 0, 0, 405)]
    [InlineData("scale", 0, 0, 102)]
    public void Validate_OutOfRange_ThrowsKeyedByHandAndField(string field, double position, double rotation, int scale)
    {
        var grip = field switch
        {
            "x" => new WeaponGrip { X = position, Scale = scale },
            "y" => new WeaponGrip { Y = position, Scale = scale },
            "rx" => new WeaponGrip { Rx = rotation, Scale = scale },
            _ => new WeaponGrip { Scale = scale }
        };

        var act = () => grip.Validate("rightWeapon");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey($"rightWeapon.grip.{field}");
    }

    [Fact]
    public void Validate_NotANumber_Throws()
    {
        var act = () => new WeaponGrip { Z = double.NaN }.Validate("leftWeapon");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("leftWeapon.grip.z");
    }

    [Fact]
    public void Json_RoundTrips()
    {
        var grip = new WeaponGrip { X = 0.1, Y = -0.02, Z = 0, Rx = 0, Ry = 45, Rz = 90, Scale = 120 };

        var json = grip.ToJson();

        json.Should().Be("{\"x\":0.1,\"y\":-0.02,\"z\":0,\"rx\":0,\"ry\":45,\"rz\":90,\"scale\":120}");
        WeaponGrip.FromJson(json).Should().Be(grip);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json")]
    public void FromJson_NothingReadable_IsNull(string? json)
    {
        WeaponGrip.FromJson(json).Should().BeNull();
    }
}
