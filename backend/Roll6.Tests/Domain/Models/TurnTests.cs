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
        var turn = Turn.Movement(10, 30, 80, null, null, 2, 1, (1, 2, 3), (4, 5, 0));

        (turn.TurnType, turn.TurnNo, turn.CharacterId).Should().Be((TurnType.Movement, 2, (long?)80));
        (turn.BeforeX, turn.BeforeY, turn.BeforeLook, turn.X, turn.Y, turn.Look)
            .Should().Be(((int?)1, (int?)2, (int?)3, (int?)4, (int?)5, (int?)0));
    }

    [Fact]
    public void Action_TrimsTheText()
    {
        var turn = Turn.Action(10, 30, null, 8, 90, 1, 1, "  Ataca o orc  ");

        (turn.TurnType, turn.Description, turn.NpcId, turn.MapNpcId).Should().Be((TurnType.Action, "Ataca o orc", (long?)8, (long?)90));
    }

    [Fact]
    public void ActionResult_WithoutText_Throws()
    {
        var act = () => Turn.ActionResult(10, null, 80, null, null, 1, 1, " ");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("description");
    }

    [Theory]
    [InlineData(null, null, null, 1, "characterId")]
    [InlineData(80L, 8L, null, 1, "characterId")]
    [InlineData(80L, null, 90L, 1, "mapNpcId")]
    [InlineData(80L, null, null, 0, "turnNo")]
    public void Create_InvalidActor_Throws(long? characterId, long? npcId, long? mapNpcId, int turnNo, string field)
    {
        var act = () => Turn.Action(10, null, characterId, npcId, mapNpcId, turnNo, 1, "x");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Fact]
    public void Movement_InvalidLook_Throws()
    {
        var act = () => Turn.Movement(10, 30, 80, null, null, 1, 1, (0, 0, 6), (1, 1, 0));

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("beforeLook");
    }

    [Fact]
    public void Campaign_AdvanceTurn_Increments()
    {
        var campaign = new Campaign { CurrentTurn = 3 };

        campaign.AdvanceTurn();

        campaign.CurrentTurn.Should().Be(4);
    }

    // ---- 024: author, movement points and character updates ----

    [Fact]
    public void Factories_RequireTheAuthor()
    {
        var act = () => Turn.Action(10, 30, 80, null, null, 1, 0, "Ataca");

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("userId");
        Turn.Action(10, 30, 80, null, null, 1, 7, "Ataca").UserId.Should().Be(7);
    }

    [Fact]
    public void Movement_KeepsThePointsSpent()
    {
        var turn = Turn.Movement(10, 30, 80, null, null, 2, 5, (1, 2, 3), (1, 1, 0), moved: 4);

        (turn.UserId, turn.Moved).Should().Be((5L, (int?)4));
        var act = () => Turn.Movement(10, 30, 80, null, null, 2, 5, (1, 2, 3), (1, 1, 0), moved: -1);
        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("moved");
    }

    [Fact]
    public void CharacterUpdate_KeepsTheChanges_AndNeedsAtLeastOne()
    {
        var turn = Turn.CharacterUpdate(10, 30, 80, null, null, 2, 1, new[] { new TurnChange("currentLife", "10", "6") });

        (turn.TurnType, turn.UserId).Should().Be((TurnType.CharacterUpdate, 1L));
        turn.Changes.Should().ContainSingle().Which.Should().BeEquivalentTo(new TurnChange("currentLife", "10", "6"));
        var act = () => Turn.CharacterUpdate(10, 30, 80, null, null, 2, 1, Array.Empty<TurnChange>());
        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("changes");
    }

    [Fact]
    public void Diff_KeepsOnlyChangedFields()
    {
        var changes = TurnChange.Diff(("currentLife", 10, 6), ("currentEnergy", 5, 5), ("characterStatus", null, ""), ("notes", "a", "b"));

        changes.Select(c => (c.Field, c.Before, c.After)).Should().Equal(("currentLife", "10", "6"), ("notes", "a", "b"));
    }

    // ---- 027: narration ----

    [Fact]
    public void Narration_HasNoActor_AndAcceptsLongTexts()
    {
        var turn = Turn.Narration(10, 30, 3, 1, new string('a', 5000));

        (turn.TurnType, turn.CharacterId, turn.NpcId, turn.MapNpcId, turn.UserId).Should().Be((TurnType.Narration, (long?)null, (long?)null, (long?)null, 1L));
    }

    [Fact]
    public void Narration_RequiresTheTextWithinTheLimit()
    {
        ((Action)(() => Turn.Narration(10, 30, 3, 1, " "))).Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("narration");
        ((Action)(() => Turn.Narration(10, 30, 3, 1, new string('a', Turn.MAX_NARRATION + 1)))).Should().Throw<DomainValidationException>();
        ((Action)(() => Turn.Action(10, 30, 80, null, null, 3, 1, new string('a', Turn.MAX_DESCRIPTION + 1)))).Should().Throw<DomainValidationException>();
    }

    // ---- 030: changes made by the master ----

    [Fact]
    public void ChangeText_KeepsTypeActorAuthorAndDate()
    {
        var turn = Turn.Action(10, 30, 80, null, null, 2, 7, "Ataca");
        turn.TurnId = 500;
        var created = turn.CreatedAt;

        turn.ChangeText("  Ataca o orc  ");

        (turn.Description, turn.TurnId, turn.TurnType, turn.CharacterId, turn.UserId, turn.CreatedAt)
            .Should().Be(("Ataca o orc", 500L, TurnType.Action, (long?)80, 7L, created));
    }

    [Fact]
    public void ChangeText_UsesTheLimitOfTheType()
    {
        var narration = Turn.Narration(10, 30, 2, 1, "Início");
        narration.ChangeText(new string('a', Turn.MAX_NARRATION));
        narration.Description.Should().HaveLength(Turn.MAX_NARRATION);

        var action = Turn.ActionResult(10, 30, 80, null, null, 2, 1, "Acertou");
        ((Action)(() => action.ChangeText(new string('a', Turn.MAX_DESCRIPTION + 1)))).Should().Throw<DomainValidationException>();
        ((Action)(() => action.ChangeText(" "))).Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("description");
    }

    [Fact]
    public void ChangeText_OnMovementOrCharacterUpdate_Throws()
    {
        var move = Turn.Movement(10, 30, 80, null, null, 2, 1, (1, 2, 3), (4, 5, 0));
        var update = Turn.CharacterUpdate(10, 30, 80, null, null, 2, 1, new[] { new TurnChange("currentLife", "10", "6") });

        ((Action)(() => move.ChangeText("x"))).Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("description");
        ((Action)(() => update.ChangeText("x"))).Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("description");
    }

    [Fact]
    public void ChangeMovement_AppliesOnlyTheGivenValues()
    {
        var move = Turn.Movement(10, 30, 80, null, null, 2, 1, (1, 2, 3), (4, 5, 0), 3);

        move.ChangeMovement(null, null, null, 6, null, 2, 5);

        (move.BeforeX, move.BeforeY, move.BeforeLook, move.X, move.Y, move.Look, move.Moved)
            .Should().Be(((int?)1, (int?)2, (int?)3, (int?)6, (int?)5, (int?)2, (int?)5));
    }

    [Fact]
    public void ChangeMovement_InvalidValuesOrWrongType_Throw()
    {
        var move = Turn.Movement(10, 30, 80, null, null, 2, 1, (1, 2, 3), (4, 5, 0));
        var action = Turn.Action(10, 30, 80, null, null, 2, 1, "Ataca");

        ((Action)(() => move.ChangeMovement(null, null, 6, null, null, null, null))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("beforeLook");
        ((Action)(() => move.ChangeMovement(null, null, null, null, null, null, -1))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("moved");
        ((Action)(() => action.ChangeMovement(null, null, null, 3, null, null, null))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("x");
        move.Look.Should().Be(0);
    }

    [Fact]
    public void ChangeChanges_ReplacesTheList_AndValidates()
    {
        var update = Turn.CharacterUpdate(10, 30, 80, null, null, 2, 1, new[] { new TurnChange("currentLife", "10", "6") });
        var action = Turn.Action(10, 30, 80, null, null, 2, 1, "Ataca");

        update.ChangeChanges(new[] { new TurnChange("currentLife", "10", "4"), new TurnChange("characterStatus", null, "Caído") });

        update.Changes!.Select(c => (c.Field, c.After)).Should().Equal(("currentLife", "4"), ("characterStatus", "Caído"));
        ((Action)(() => update.ChangeChanges(Array.Empty<TurnChange>()))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("changes");
        ((Action)(() => update.ChangeChanges(new[] { new TurnChange(" ", "1", "2") }))).Should().Throw<DomainValidationException>();
        ((Action)(() => action.ChangeChanges(new[] { new TurnChange("currentLife", "1", "2") }))).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("changes");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void MoveToTurn_OutsideOneToCurrent_Throws(int turnNo)
    {
        var turn = Turn.Action(10, 30, 80, null, null, 2, 1, "Ataca");

        ((Action)(() => turn.MoveToTurn(turnNo, 5))).Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("turnNo");
        turn.MoveToTurn(5, 5);
        turn.TurnNo.Should().Be(5);
    }
}
