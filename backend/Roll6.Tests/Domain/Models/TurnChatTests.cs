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

        var action = Turn.Action(10, 30, 80, null, null, 3, 2, "Ataco");
        ((Action)(() => action.Delete(1, isMaster: true))).Should().Throw<DomainValidationException>();
        ((Action)(() => Turn.TurnFinished(10, null, 3, 1).Delete(1, isMaster: true))).Should().Throw<DomainValidationException>();
    }
}
