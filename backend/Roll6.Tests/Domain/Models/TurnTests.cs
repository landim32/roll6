using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class TurnTests
{
    [Fact]
    public void Movement_StoresBeforeAndAfter()
    {
        var turn = Turn.Movement(10, 30, 80, null, null, 2, (1, 2, 3), (4, 5, 0));

        (turn.TurnType, turn.TurnNo, turn.CharacterId).Should().Be((TurnType.Movement, 2, (long?)80));
        (turn.BeforeX, turn.BeforeY, turn.BeforeLook, turn.X, turn.Y, turn.Look)
            .Should().Be(((int?)1, (int?)2, (int?)3, (int?)4, (int?)5, (int?)0));
    }

    [Fact]
    public void Action_TrimsTheText()
    {
        var turn = Turn.Action(10, 30, null, 8, 90, 1, "  Ataca o orc  ");

        (turn.TurnType, turn.Description, turn.NpcId, turn.MapNpcId).Should().Be((TurnType.Action, "Ataca o orc", (long?)8, (long?)90));
    }

    [Fact]
    public void ActionResult_WithoutText_Throws()
    {
        var act = () => Turn.ActionResult(10, null, 80, null, null, 1, " ");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("description");
    }

    [Theory]
    [InlineData(null, null, null, 1, "characterId")]
    [InlineData(80L, 8L, null, 1, "characterId")]
    [InlineData(80L, null, 90L, 1, "mapNpcId")]
    [InlineData(80L, null, null, 0, "turnNo")]
    public void Create_InvalidActor_Throws(long? characterId, long? npcId, long? mapNpcId, int turnNo, string field)
    {
        var act = () => Turn.Action(10, null, characterId, npcId, mapNpcId, turnNo, "x");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Fact]
    public void Movement_InvalidLook_Throws()
    {
        var act = () => Turn.Movement(10, 30, 80, null, null, 1, (0, 0, 6), (1, 1, 0));

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("beforeLook");
    }

    [Fact]
    public void Campaign_AdvanceTurn_Increments()
    {
        var campaign = new Campaign { CurrentTurn = 3 };

        campaign.AdvanceTurn();

        campaign.CurrentTurn.Should().Be(4);
    }
}
