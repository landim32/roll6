using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Tests.Domain.Services;

/// <summary>079: the master who also plays switches the voice of his own messages (same fixture as the chat tests).</summary>
public partial class TurnServiceChatTests
{
    private const long GORAN = 85;
    private const long MASTER_TEXT = 760;

    /// <summary>The master (Ana) plays Goran, approved in the campaign; he wrote a text as the master.</summary>
    private Turn MasterPlaysGoran(long? speaker = null, TurnType type = TurnType.Text)
    {
        var goran = new Character { CharacterId = GORAN, UserId = MASTER, Name = "Goran", Image = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png" };
        _characterRepository.Setup(r => r.GetByIdAsync(GORAN)).ReturnsAsync(goran);
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, GORAN)).ReturnsAsync(new CampaignCharacter
            { CampaignId = CAMPAIGN, CharacterId = GORAN, Status = CampaignCharacterStatus.Approved });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync((IEnumerable<long> ids) => new[] { goran }.Where(c => ids.Contains(c.CharacterId)).ToList());
        var turn = type == TurnType.Roll
            ? Turn.DiceRoll(CAMPAIGN, MAP, 3, MASTER, speaker, speaker == null ? "Mestre (GM) — Ana" : "Goran", null, new[] { 1, 2, 3 }, null)
            : Turn.Text(CAMPAIGN, MAP, 3, MASTER, speaker, speaker == null ? "Mestre (GM) — Ana" : "Goran", null, "Silêncio!");
        turn.TurnId = MASTER_TEXT;
        _repository.Setup(r => r.GetByIdAsync(MASTER_TEXT)).ReturnsAsync(turn);
        return turn;
    }

    [Fact]
    public async Task SetSpeaker_MasterToOwnCharacter_AndBack_KeepsTheEntry()
    {
        var turn = MasterPlaysGoran();
        var created = turn.CreatedAt;

        var asGoran = await _service.SetSpeakerAsync(MASTER, MASTER_TEXT, new ChatSpeakerInfo { CharacterId = GORAN });

        (asGoran.CharacterId, asGoran.DisplayName, asGoran.TurnId).Should().Be(((long?)GORAN, "Goran", MASTER_TEXT));
        turn.DisplayImage.Should().Be("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png");
        turn.CreatedAt.Should().Be(created);
        _repository.Verify(r => r.UpdateAsync(It.Is<Turn>(t => t.TurnId == MASTER_TEXT && t.CharacterId == GORAN)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED)), Times.Once);

        var asMaster = await _service.SetSpeakerAsync(MASTER, MASTER_TEXT, new ChatSpeakerInfo { CharacterId = null });
        (asMaster.CharacterId, asMaster.DisplayName).Should().Be(((long?)null, "Mestre (GM) — Ana"));
    }

    [Fact]
    public async Task SetSpeaker_SameVoice_ChangesNothing()
    {
        MasterPlaysGoran();

        await _service.SetSpeakerAsync(MASTER, MASTER_TEXT, new ChatSpeakerInfo { CharacterId = null });

        _repository.Verify(r => r.UpdateAsync(It.IsAny<Turn>()), Times.Never);
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task SetSpeaker_AlsoForARoll()
    {
        MasterPlaysGoran(type: TurnType.Roll);

        var item = await _service.SetSpeakerAsync(MASTER, MASTER_TEXT, new ChatSpeakerInfo { CharacterId = GORAN });

        (item.Kind, item.CharacterId).Should().Be(("roll", (long?)GORAN));
    }

    [Fact]
    public async Task SetSpeaker_ByAPlayer_OrOnSomeoneElsesMessage_Is403()
    {
        MasterPlaysGoran();
        var aria = Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "Oi");
        aria.TurnId = 761;
        _repository.Setup(r => r.GetByIdAsync(761)).ReturnsAsync(aria);

        await _service.Invoking(s => s.SetSpeakerAsync(PLAYER, 761, new ChatSpeakerInfo { CharacterId = null }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.SetSpeakerAsync(MASTER, 761, new ChatSpeakerInfo { CharacterId = GORAN }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task SetSpeaker_ToACharacterNotHisOrNotApproved_Is403()
    {
        MasterPlaysGoran();

        // Aria belongs to the player; Bram is not approved.
        await _service.Invoking(s => s.SetSpeakerAsync(MASTER, MASTER_TEXT, new ChatSpeakerInfo { CharacterId = ARIA }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.SetSpeakerAsync(MASTER, MASTER_TEXT, new ChatSpeakerInfo { CharacterId = BRAM }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task SetSpeaker_OnADeletedEntryOrAPoll_Is400()
    {
        var turn = MasterPlaysGoran();
        turn.Delete(MASTER, true);
        (await _service.Invoking(s => s.SetSpeakerAsync(MASTER, MASTER_TEXT, new ChatSpeakerInfo { CharacterId = GORAN }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("characterId");

        var poll = Turn.Poll(CAMPAIGN, MAP, 3, MASTER, null, "Mestre (GM) — Ana", null, "Para onde?");
        poll.TurnId = 762;
        _repository.Setup(r => r.GetByIdAsync(762)).ReturnsAsync(poll);
        (await _service.Invoking(s => s.SetSpeakerAsync(MASTER, 762, new ChatSpeakerInfo { CharacterId = GORAN }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("characterId");
    }

    [Fact]
    public async Task SetSpeaker_ToACharacterTheWhisperIsFor_Is400()
    {
        var turn = MasterPlaysGoran();
        turn.IsWhisper = true;
        _whispers.Setup(r => r.ListByTurnsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<TurnWhisperTarget> { TurnWhisperTarget.Create(MASTER_TEXT, GORAN) });

        (await _service.Invoking(s => s.SetSpeakerAsync(MASTER, MASTER_TEXT, new ChatSpeakerInfo { CharacterId = GORAN }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors["characterId"].Should().Contain("Este sussurro é para esse personagem.");
    }
}
