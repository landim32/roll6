using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Weapons;

namespace Roll6.Tests.Domain.Weapons;

public class WeaponPoseTests
{
    [Fact]
    public void Default_IsTheFileAsIs()
    {
        WeaponPose.Default.Should().Be(new WeaponPose(0, 0, 0));
        WeaponPose.Default.Validate("pose").Normalized().Should().Be(WeaponPose.Default);
    }

    [Theory]
    [InlineData(90, 180, 270, 90, 180, 270)]
    [InlineData(-90, 0, 0, 270, 0, 0)]
    [InlineData(360, -360, -180, 0, 0, 180)]
    [InlineData(0, -270, 0, 0, 90, 0)]
    [InlineData(45, -7, 359, 45, 353, 359)]
    public void Normalized_PutsEveryAngleIn0To359(int rx, int ry, int rz, int nx, int ny, int nz)
    {
        new WeaponPose(rx, ry, rz).Validate("pose").Normalized().Should().Be(new WeaponPose(nx, ny, nz));
    }

    [Theory]
    [InlineData(361, 0, 0, "rx")]
    [InlineData(0, -361, 0, "ry")]
    [InlineData(0, 0, 450, "rz")]
    public void Validate_OutOfRange_ThrowsKeyedByField(int rx, int ry, int rz, string field)
    {
        var act = () => new WeaponPose(rx, ry, rz).Validate("pose");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey($"pose.{field}");
    }
}
