using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Npcs;

namespace Roll6.Tests.Domain.Npcs;

public class NpcRemovalTests
{
    [Theory]
    [InlineData(Posture.Standing, NpcRemoval.Outcome.Delete)]
    [InlineData(Posture.Down, NpcRemoval.Outcome.Body)]
    [InlineData(Posture.OutOfCombat, NpcRemoval.Outcome.Body)]
    public void Decide_FollowsThePosture(Posture posture, NpcRemoval.Outcome expected) =>
        NpcRemoval.Decide(new MapNpc { Name = "Goblin", Posture = posture }).Should().Be(expected);

    [Fact]
    public void LeavesBody_Standing_TouchesNothing()
    {
        var piece = MapToken.PlaceNpc(1, 5, 9, "Goblin", 2, 3, 1);

        NpcRemoval.LeavesBody(new MapNpc { MapNpcId = 9, Name = "Goblin" }, piece).Should().BeFalse();

        piece.MapNpcId.Should().Be(9);
        piece.TokenType.Should().Be(MapTokenType.Npc);
    }

    [Fact]
    public void LeavesBody_Down_TurnsThePieceIntoAnObject()
    {
        var piece = MapToken.PlaceNpc(1, 5, 9, "Goblin", 2, 3, 1);

        NpcRemoval.LeavesBody(new MapNpc { MapNpcId = 9, Name = "Goblin 2", Posture = Posture.Down }, piece).Should().BeTrue();

        piece.TokenType.Should().Be(MapTokenType.Object);
        piece.MapNpcId.Should().BeNull();
        piece.Posture.Should().Be(Posture.Down);
        piece.Name.Should().Be("Goblin 2");
    }
}
