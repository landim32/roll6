using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Weapons;
using Roll6.DTO.Weapon;

namespace Roll6.Tests.Domain.Weapons;

public class TokenWeaponSetTests
{
    [Fact]
    public void Parse_OrdersBySocketAndKeepsTheGrips()
    {
        var set = TokenWeaponSet.Parse(new List<TokenWeaponInfo>
        {
            new() { Socket = 3, WeaponId = 7 },
            new() { Socket = 1, WeaponId = 8, Grip = new WeaponGripInfo { Scale = 120, Rz = 15 } },
            new() { Socket = 5, WeaponId = 7, Grip = new WeaponGripInfo { Scale = 100 } }
        }, hasModel: true);

        set.Select(entry => entry.Socket).Should().Equal(WeaponSocket.RightHand, WeaponSocket.Back, WeaponSocket.LeftHolster);
        set[0].WeaponId.Should().Be(8);
        set[0].Grip.Should().Be(new WeaponGrip { Scale = 120, Rz = 15 });
        set[1].Grip.Should().BeNull();
        TokenWeaponSet.WeaponIds(set).Should().BeEquivalentTo(new long[] { 7, 8 });
    }

    [Fact]
    public void Parse_WithoutAModel_IsEmpty()
    {
        TokenWeaponSet.Parse(new List<TokenWeaponInfo> { new() { Socket = 1, WeaponId = 7 } }, hasModel: false).Should().BeEmpty();
        TokenWeaponSet.Parse(null, hasModel: true).Should().BeEmpty();
        TokenWeaponSet.Parse(new List<TokenWeaponInfo>(), hasModel: true).Should().BeEmpty();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void Parse_UnknownSocket_ThrowsKeyedByIndex(int socket)
    {
        var act = () => TokenWeaponSet.Parse(new List<TokenWeaponInfo>
        {
            new() { Socket = 1, WeaponId = 7 },
            new() { Socket = socket, WeaponId = 7 }
        }, hasModel: true);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("weapons[1].socket")
            .WhoseValue.Should().Contain(TokenWeaponSet.UNKNOWN_SOCKET);
    }

    [Fact]
    public void Parse_RepeatedSocket_ThrowsAtTheRepeat()
    {
        var act = () => TokenWeaponSet.Parse(new List<TokenWeaponInfo>
        {
            new() { Socket = 2, WeaponId = 7 },
            new() { Socket = 1, WeaponId = 8 },
            new() { Socket = 2, WeaponId = 9 }
        }, hasModel: true);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("weapons[2].socket")
            .WhoseValue.Should().Contain(TokenWeaponSet.REPEATED_SOCKET);
    }

    [Fact]
    public void Parse_GripOutOfRange_ThrowsKeyedByIndexAndField()
    {
        var act = () => TokenWeaponSet.Parse(new List<TokenWeaponInfo>
        {
            new() { Socket = 4, WeaponId = 7, Grip = new WeaponGripInfo { X = 3 } }
        }, hasModel: true);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("weapons[0].grip.x");
    }
}
