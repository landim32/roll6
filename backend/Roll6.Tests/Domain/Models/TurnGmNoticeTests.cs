using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Gm;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

/// <summary>The GM line of the chat (096): the master's user as "GM", a plain line like the poke.</summary>
public class TurnGmNoticeTests
{
    [Fact]
    public void AGmLineIsTheMastersPlainLine()
    {
        var turn = Turn.GmNotice(10, 2, 7, 1, GmTurn.Started(7));

        turn.TurnType.Should().Be(TurnType.GmNotice);
        turn.CampaignId.Should().Be(10);
        turn.MapId.Should().Be(2);
        turn.TurnNo.Should().Be(7);
        turn.UserId.Should().Be(1);
        turn.CharacterId.Should().BeNull();
        turn.DisplayName.Should().Be("GM");
        turn.Description.Should().Be("O GM começou a processar o turno 7.");
        turn.CanReply.Should().BeFalse("neither a reply target nor reactable");
        TurnTypes.IsConversation(TurnType.GmNotice).Should().BeFalse();
        TurnTypes.IsLog(TurnType.GmNotice).Should().BeFalse();
    }

    [Fact]
    public void TheLineIsCutToOneLineAndTheTurnMustExist()
    {
        Turn.GmNotice(10, null, 7, 1, "a\n" + new string('b', 400)).Description!.Length.Should().BeLessOrEqualTo(GmTurn.MAX_LINE);
        var act = () => Turn.GmNotice(10, null, 0, 1, "x");
        act.Should().Throw<DomainValidationException>();
    }
}
