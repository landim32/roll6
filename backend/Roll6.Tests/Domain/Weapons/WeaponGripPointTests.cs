using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Weapons;

namespace Roll6.Tests.Domain.Weapons;

public class WeaponGripPointTests
{
    [Fact]
    public void Default_IsTheMiddle()
    {
        WeaponGripPoint.Default.Should().Be(new WeaponGripPoint(0.5, 0.5, 0.5));
    }

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(1, 1, 1)]
    [InlineData(0.5, 0.12, 0.98)]
    public void Validate_AcceptsTheBox(double x, double y, double z)
    {
        var point = new WeaponGripPoint(x, y, z);

        point.Validate("gripPoint").Should().Be(point);
    }

    [Theory]
    [InlineData(-0.1, 0.5, 0.5, "x")]
    [InlineData(0.5, 1.1, 0.5, "y")]
    [InlineData(0.5, 0.5, double.NaN, "z")]
    public void Validate_OutsideTheBox_ThrowsKeyedByField(double x, double y, double z, string field)
    {
        var act = () => new WeaponGripPoint(x, y, z).Validate("gripPoint");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey($"gripPoint.{field}");
    }
}
