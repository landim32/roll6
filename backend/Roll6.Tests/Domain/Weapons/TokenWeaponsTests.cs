using FluentAssertions;
using Roll6.Domain.Models;
using Roll6.Domain.Weapons;

namespace Roll6.Tests.Domain.Weapons;

public class TokenWeaponsTests
{
    private const string FILE = "0123456789abcdef0123456789abcdef.glb";

    [Fact]
    public void Read_FillsTheWeaponAndTheDefaultGrip_OrderedBySocket()
    {
        var sword = Weapon.Create(2, "Espada", FILE, new WeaponGripPoint(0.5, 0.1, 0.5), new WeaponPose(0, 0, 270));
        sword.WeaponId = 7;
        var rows = new[]
        {
            TokenWeapon.Create(5, WeaponSocket.Back, 7, null),
            TokenWeapon.Create(5, WeaponSocket.RightHand, 7, new WeaponGrip { Scale = 120 }),
            TokenWeapon.Create(5, WeaponSocket.LeftHand, 99, null)
        };

        var read = TokenWeapons.Read(rows, new Dictionary<long, Weapon> { [7] = sword }, name => "https://x/" + name);

        read.Select(item => item.Socket).Should().Equal(1, 3);
        read[0].WeaponId.Should().Be(7);
        read[0].Name.Should().Be("Espada");
        read[0].ModelFile.Should().Be(FILE);
        read[0].ModelFileUrl.Should().Be("https://x/" + FILE);
        read[0].GripPoint!.Y.Should().Be(0.1);
        read[0].Pose!.Rz.Should().Be(270);
        read[0].Grip!.Scale.Should().Be(120);
        read[1].Grip!.Scale.Should().Be(100);
        read[1].Grip.X.Should().Be(0);
    }

    [Fact]
    public void IdsOf_IsDistinct()
    {
        var rows = new[]
        {
            TokenWeapon.Create(5, WeaponSocket.RightHand, 7, null),
            TokenWeapon.Create(5, WeaponSocket.Back, 7, null),
            TokenWeapon.Create(6, WeaponSocket.LeftHand, 8, null)
        };

        TokenWeapons.IdsOf(rows).Should().BeEquivalentTo(new long[] { 7, 8 });
    }
}
