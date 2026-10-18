using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Weapons;

namespace Roll6.Tests.Domain.Models;

public class WeaponTests
{
    private const string FILE = "0123456789abcdef0123456789abcdef.glb";
    private const string OTHER_FILE = "fedcba9876543210fedcba9876543210.glb";

    [Fact]
    public void Create_KeepsTheValues()
    {
        var weapon = Weapon.Create(3, "  Espada longa  ", FILE);

        weapon.UserId.Should().Be(3);
        weapon.Name.Should().Be("Espada longa");
        weapon.ModelFile.Should().Be(FILE);
        weapon.CreatedAt.Should().Be(weapon.UpdatedAt);
        weapon.IsOwnedBy(3).Should().BeTrue();
        weapon.IsOwnedBy(4).Should().BeFalse();
        weapon.GripPoint.Should().Be(WeaponGripPoint.Default);
        weapon.Pose.Should().Be(WeaponPose.Default);
    }

    [Fact]
    public void Create_WithGripPointAndPose_StoresThemNormalized()
    {
        var weapon = Weapon.Create(3, "Espada", FILE, new WeaponGripPoint(0.5, 0.1, 0.5), new WeaponPose(-90, 360, 270));

        weapon.GripPoint.Should().Be(new WeaponGripPoint(0.5, 0.1, 0.5));
        weapon.Pose.Should().Be(new WeaponPose(270, 0, 270));
    }

    [Fact]
    public void SetPose_OutOfRange_ThrowsKeyedByField()
    {
        var weapon = Weapon.Create(3, "Espada", FILE);

        var act = () => weapon.SetPose(new WeaponPose(0, 450, 0));

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("pose.ry");
    }

    [Fact]
    public void SetGripPoint_OutsideTheBox_ThrowsKeyedByField()
    {
        var weapon = Weapon.Create(3, "Espada", FILE);

        var act = () => weapon.SetGripPoint(new WeaponGripPoint(0.5, 0.5, 1.5));

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("gripPoint.z");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    public void Create_WithoutName_Throws(string? name)
    {
        var act = () => Weapon.Create(3, name, FILE);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("name");
    }

    [Fact]
    public void Create_NameOver100_Throws()
    {
        var act = () => Weapon.Create(3, new string('a', 101), FILE);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("name");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("espada.glb")]
    [InlineData("0123456789abcdef0123456789abcdef.png")]
    public void Create_WithoutAnUploadedModel_Throws(string? file)
    {
        var act = () => Weapon.Create(3, "Espada", file);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("modelFile");
    }

    [Fact]
    public void RenameAndReplaceFile_ChangeTheValues()
    {
        var weapon = Weapon.Create(3, "Espada", FILE);
        weapon.UpdatedAt = DateTime.UtcNow.AddDays(-1);

        weapon.Rename("Machado");
        weapon.ReplaceFile(OTHER_FILE);

        weapon.Name.Should().Be("Machado");
        weapon.ModelFile.Should().Be(OTHER_FILE);
        weapon.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }
}
