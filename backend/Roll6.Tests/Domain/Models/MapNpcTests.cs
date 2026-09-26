using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class MapNpcTests
{
    [Fact]
    public void FromNpc_CopiesNameLifeAndEnergy()
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin", Life = 7, Energy = 2 });

        (mapNpc.MapId, mapNpc.NpcId, mapNpc.Name, mapNpc.Life, mapNpc.Energy, mapNpc.Status)
            .Should().Be((30L, 8L, "Goblin", 7, 2, (string?)null));
    }

    [Fact]
    public void Update_AllowsFallenValues()
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin", Life = 7 });

        mapNpc.Update("Goblin 2", -3, 0, " caído ");

        (mapNpc.Name, mapNpc.Life, mapNpc.Energy, mapNpc.Status).Should().Be(("Goblin 2", -3, 0, "caído"));
    }

    [Fact]
    public void Update_InvalidTexts_Throw()
    {
        var mapNpc = MapNpc.FromNpc(30, new Npc { NpcId = 8, Name = "Goblin" });

        ((Action)(() => mapNpc.Update(" ", 1, 1, null))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("name");
        ((Action)(() => mapNpc.Update("Goblin", 1, 1, new string('x', 261)))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("status");
    }
}
