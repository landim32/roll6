using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

/// <summary>041: the turn log and the chat are one timeline — chat messages and dividers on <see cref="Turn"/>.</summary>
public class TurnChatTests
{
    private const string IMAGE = "0123456789abcdef0123456789abcdef.png";
    private const string AUDIO = "0123456789abcdef0123456789abcdef.webm";

    private static Turn Text(long userId = 2, string text = "Abro a porta") =>
        Turn.Text(10, 30, 3, userId, 80, "Aria", null, text);

    [Fact]
    public void Text_KeepsWhoSpokeAndTheTurn()
    {
        var turn = Text();

        (turn.TurnType, turn.TurnNo, turn.CharacterId, turn.DisplayName, turn.Description, turn.IsConversation, turn.IsLog)
            .Should().Be((TurnType.Text, 3, (long?)80, "Aria", "Abro a porta", true, false));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Text_Empty_Throws(string text)
    {
        ((Action)(() => Text(text: text))).Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("text");
    }

    [Fact]
    public void Text_TooLong_Throws()
    {
        ((Action)(() => Text(text: new string('x', Turn.MAX_TEXT + 1)))).Should().Throw<DomainValidationException>();
    }

    [Fact]
    public void Photo_NeedsAStoredImage()
    {
        Turn.Photo(10, null, 1, 2, null, "Mestre (GM) — Ana", null, IMAGE, "Olhem isto").Image.Should().Be(IMAGE);
        ((Action)(() => Turn.Photo(10, null, 1, 2, null, "X", null, null, null)))
            .Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("image");
        ((Action)(() => Turn.Photo(10, null, 1, 2, null, "X", null, "foto.gif", null)))
            .Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("image");
    }

    [Theory]
    [InlineData(AUDIO, 0, "audioSeconds")]
    [InlineData(AUDIO, 121, "audioSeconds")]
    [InlineData("audio.mp3", 10, "audio")]
    public void Recording_Validates(string audio, int seconds, string key)
    {
        ((Action)(() => Turn.Recording(10, null, 1, 2, null, "X", null, audio, seconds, null)))
            .Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(key);
    }

    [Fact]
    public void Recording_AcceptsTheBrowserFormats()
    {
        foreach (var ext in new[] { "webm", "mp4", "m4a", "ogg" })
            Turn.Recording(10, null, 1, 2, null, "X", null, $"0123456789abcdef0123456789abcdef.{ext}", 20, null).AudioSeconds.Should().Be(20);
    }

    [Fact]
    public void TurnFinished_IsNeitherLogNorConversation()
    {
        var divider = Turn.TurnFinished(10, null, 4, 1);

        (divider.TurnType, divider.TurnNo, divider.IsLog, divider.IsConversation).Should().Be((TurnType.TurnFinished, 4, false, false));
    }

    [Fact]
    public void Delete_AuthorOrMaster()
    {
        Text(userId: 2).Delete(2, isMaster: false).Should().BeTrue();
        Text(userId: 2).Delete(1, isMaster: true).Should().BeTrue();
        ((Action)(() => Text(userId: 2).Delete(3, isMaster: false))).Should().Throw<UnauthorizedAccessException>();
    }

    [Fact]
    public void Delete_Twice_IsANoOp()
    {
        var turn = Text();
        turn.Delete(2, false);

        turn.Delete(2, false).Should().BeFalse();
        turn.IsDeleted.Should().BeTrue();
    }

    [Fact]
    public void Delete_NarrationOnlyByTheMaster_AndOtherRecordsNever()
    {
        var narration = Turn.Narration(10, null, 3, 1, "A ponte caiu.");
        ((Action)(() => narration.Delete(1, isMaster: false))).Should().Throw<UnauthorizedAccessException>();
        narration.Delete(1, isMaster: true).Should().BeTrue();

        // 044: deleting an action cancels it, once.
        var action = Turn.Action(10, 30, 80, null, null, 3, 2, "Ataco");
        action.Delete(1, isMaster: true).Should().BeTrue();
        (action.IsCancelled, action.IsValidAction).Should().Be((true, false));
        ((Action)(() => action.Delete(1, isMaster: true))).Should().Throw<DomainValidationException>();
        ((Action)(() => Turn.TurnFinished(10, null, 3, 1).Delete(1, isMaster: true))).Should().Throw<DomainValidationException>();
    }

    [Fact]
    public void DiceRoll_KeepsTheFaces_AndValidatesThem()
    {
        var roll = Turn.DiceRoll(1, null, 2, 5, 80, "Aria", null, new[] { 5, 3, 6 }, " Ataque ");
        (roll.TurnType, roll.Dice, roll.Description, roll.IsConversation).Should().Be((TurnType.Roll, "5,3,6", "Ataque", true));
        roll.DiceValues().Should().Equal(5, 3, 6);

        FluentActions.Invoking(() => Turn.DiceRoll(1, null, 2, 5, 80, "Aria", null, new[] { 5, 7, 1 }, null))
            .Should().Throw<DomainValidationException>();
        FluentActions.Invoking(() => Turn.DiceRoll(1, null, 2, 5, 80, "Aria", null, new[] { 5, 3 }, null))
            .Should().Throw<DomainValidationException>();
    }

    [Fact]
    public void DiceRoll_OnlyTheMasterDeletesIt()
    {
        var roll = Turn.DiceRoll(1, null, 2, 5, 80, "Aria", null, new[] { 1, 2, 3 }, null);
        roll.CanBeDeletedBy(5, isMaster: false).Should().BeFalse();
        roll.CanBeDeletedBy(9, isMaster: true).Should().BeTrue();
    }

    // --- 044 ---

    [Fact]
    public void Reply_SameCampaignAndSomethingToAnswer()
    {
        var target = Turn.Text(1, null, 3, 5, 80, "Aria", null, "Oi");
        target.TurnId = 50;
        var reply = Turn.Text(1, null, 3, 6, 81, "Bram", null, "Oi!");
        reply.SetReply(target);
        reply.ReplyToTurnId.Should().Be(50);

        var other = Turn.Text(2, null, 3, 5, 80, "Aria", null, "Oi");
        FluentActions.Invoking(() => reply.SetReply(other)).Should().Throw<DomainValidationException>();
        var move = Turn.Movement(1, 30, 80, null, null, 3, 5, (1, 1, 0), (1, 2, 0));
        FluentActions.Invoking(() => reply.SetReply(move)).Should().Throw<DomainValidationException>();
    }

    [Fact]
    public void Convert_TextToActionAndBack()
    {
        var text = Turn.Text(1, null, 3, 5, 80, "Aria", null, "Abro a porta");
        text.ToAction(30);
        (text.TurnType, text.IsValidAction, text.MapId).Should().Be((TurnType.Action, true, (long?)30));

        text.ToMessage("Aria", "a.png");
        (text.TurnType, text.DisplayName).Should().Be((TurnType.Text, "Aria"));

        var master = Turn.Text(1, null, 3, 1, null, "Mestre (GM) — Ana", null, "Rolem");
        FluentActions.Invoking(() => master.ToAction(30)).Should().Throw<DomainValidationException>();
        var longText = Turn.Text(1, null, 3, 5, 80, "Aria", null, new string('a', 2500));
        FluentActions.Invoking(() => longText.ToAction(30)).Should().Throw<DomainValidationException>();
    }
}
