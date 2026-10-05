using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class MapNpcTests
{
    [Fact]
    public void FromNpc_StartsAtTheNpcTotals()
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin", Life = 7, Energy = 2, Status = "ferido" });

        (mapNpc.MapId, mapNpc.NpcId, mapNpc.Name, mapNpc.CurrentLife, mapNpc.CurrentEnergy, mapNpc.Status)
            .Should().Be((30L, 8L, "Goblin", 7, 2, "ferido"));
    }

    [Theory]
    [InlineData(Posture.Standing)]
    [InlineData(Posture.Down)]
    [InlineData(Posture.OutOfCombat)]
    public void FromNpc_StartsWithThePostureOfTheNpc(Posture posture)
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin", Life = 7, Posture = posture });

        mapNpc.Posture.Should().Be(posture);
    }

    [Fact]
    public void Update_AllowsFallenValues()
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin", Life = 7 });

        mapNpc.Update("Goblin 2", -3, 0, " caído ", 7, 0);

        (mapNpc.Name, mapNpc.CurrentLife, mapNpc.CurrentEnergy, mapNpc.Status).Should().Be(("Goblin 2", -3, 0, "caído"));
    }

    [Fact]
    public void Update_AboveTheTotals_Throws()
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin", Life = 11, Energy = 11 });

        ((Action)(() => mapNpc.Update("Goblin", 12, 1, null, 11, 11))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("currentLife");
        ((Action)(() => mapNpc.Update("Goblin", 1, 12, null, 11, 11))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("currentEnergy");
        mapNpc.CurrentLife.Should().Be(11);
    }

    [Fact]
    public void Update_InvalidTexts_Throw()
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin", Life = 5, Energy = 5 });

        ((Action)(() => mapNpc.Update(" ", 1, 1, null, 5, 5))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("name");
        ((Action)(() => mapNpc.Update("Goblin", 1, 1, new string('x', 261), 5, 5))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("status");
    }

    // ---- 031: posture ----

    [Fact]
    public void FromNpc_StartsStanding_AndChangePostureValidates()
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin", Life = 7 });

        mapNpc.Posture.Should().Be(Posture.Standing);
        mapNpc.ChangePosture((int)Posture.OutOfCombat).Should().BeTrue();
        mapNpc.ChangePosture((int)Posture.OutOfCombat).Should().BeFalse();
        mapNpc.Invoking(m => m.ChangePosture(9)).Should().Throw<DomainValidationException>();
    }
}
