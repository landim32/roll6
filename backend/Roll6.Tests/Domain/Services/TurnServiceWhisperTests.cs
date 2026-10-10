using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Domain.Whispers;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Tests.Domain.Services;

/// <summary>047: whispers — who sees them, the masking of whispered actions and the split realtime publish.</summary>
public partial class TurnServiceChatTests
{
    /// <summary>Owner of Dara, the whisper's target.</summary>
    private const long DARA_OWNER = 4;
    /// <summary>A third player, outside every whisper.</summary>
    private const long OUTSIDER = 5;
    private const long DARA = 82;

    private void SetupWhisperTable()
    {
        foreach (var user in new[] { DARA_OWNER, OUTSIDER })
            _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, user)).ReturnsAsync(true);
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, DARA)).ReturnsAsync(new CampaignCharacter
            { CampaignId = CAMPAIGN, CharacterId = DARA, Status = CampaignCharacterStatus.Approved });
        var aria = new Character { CharacterId = ARIA, UserId = PLAYER, Name = "Aria", Image = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png" };
        var dara = new Character { CharacterId = DARA, UserId = DARA_OWNER, Name = "Dara" };
        _characterRepository.Setup(r => r.GetByIdAsync(DARA)).ReturnsAsync(dara);
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync((IEnumerable<long> ids) => new[] { aria, dara }.Where(c => ids.Contains(c.CharacterId)).ToList());
        _whispers.Setup(r => r.ListByTurnsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync((IEnumerable<long> ids) => ids.Select(id => TurnWhisperTarget.Create(id, DARA)).ToList());
    }

    private Turn WhisperedAction(long id)
    {
        var action = Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Escondo a adaga");
        action.TurnId = id;
        action.CreatedAt = new DateTime(2026, 10, 9, 21, 0, 0);
        action.MarkWhisper();
        return action;
    }

    [Fact]
    public void Audience_IsAuthorMasterAndOwners()
    {
        WhisperAudience.CanSee(true, PLAYER, new[] { DARA_OWNER }, OUTSIDER, false).Should().BeFalse();
        WhisperAudience.CanSee(true, PLAYER, new[] { DARA_OWNER }, DARA_OWNER, false).Should().BeTrue();
        WhisperAudience.CanSee(true, PLAYER, new[] { DARA_OWNER }, MASTER, true).Should().BeTrue();
        WhisperAudience.CanSee(false, PLAYER, Array.Empty<long>(), OUTSIDER, false).Should().BeTrue();
        WhisperAudience.Audience(PLAYER, MASTER, new[] { DARA_OWNER }).Should().BeEquivalentTo(new[] { PLAYER, MASTER, DARA_OWNER });
        WhisperAudience.NoticeTargets(PLAYER, MASTER, false, new[] { DARA_OWNER }).Should().Equal(DARA_OWNER);
        WhisperAudience.NoticeTargets(PLAYER, MASTER, true, new[] { DARA_OWNER }).Should().BeEquivalentTo(new[] { DARA_OWNER, MASTER });
    }

    [Fact]
    public async Task Whisper_Validation()
    {
        SetupWhisperTable();
        await _service.Invoking(s => s.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo
            { CharacterId = ARIA, Text = "x", WhisperCharacterIds = new List<long> { ARIA } })).Should().ThrowAsync<DomainValidationException>();
        await _service.Invoking(s => s.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo
            { CharacterId = ARIA, Text = "x", WhisperCharacterIds = new List<long> { BRAM } })).Should().ThrowAsync<DomainValidationException>();
        await _service.Invoking(s => s.SendAsync(MASTER, CAMPAIGN, new ChatSendInfo
            { Text = "x", WhisperMaster = true })).Should().ThrowAsync<DomainValidationException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task WhisperedMessage_SavesTargets_PublishesOnlyToItsAudience_AndNotifiesOnlyTheTargets()
    {
        SetupWhisperTable();
        List<TurnWhisperTarget>? saved = null;
        _whispers.Setup(r => r.InsertAsync(It.IsAny<IEnumerable<TurnWhisperTarget>>()))
            .Callback((IEnumerable<TurnWhisperTarget> t) => saved = t.ToList()).Returns(Task.CompletedTask);

        var item = await _service.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo
            { CharacterId = ARIA, Text = "psiu", WhisperCharacterIds = new List<long> { DARA }, WhisperMaster = true });

        saved!.Select(t => (t.TurnId, t.CharacterId)).Should().Equal((900L, (long?)DARA), (900L, (long?)null));
        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.IsWhisper)), Times.Once);
        item.Whisper!.Recipients.Select(r => r.Name).Should().Contain("Dara");
        _notifier.Verify(n => n.PublishSplitAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_MESSAGE),
            It.Is<IReadOnlyCollection<long>>(a => a.Count == 3 && a.Contains(PLAYER) && a.Contains(MASTER) && a.Contains(DARA_OWNER)),
            null), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_MESSAGE)), Times.Never);
        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.TargetUserIds != null && n.TargetUserIds.Count == 1
            && n.TargetUserIds.Contains(DARA_OWNER))), Times.Once);
    }

    [Fact]
    public async Task ChatPage_IsReadForTheViewer_AndMasksWhisperedActionsOfOthers()
    {
        SetupWhisperTable();
        var action = WhisperedAction(300);
        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, 51, OUTSIDER, false)).ReturnsAsync(new List<Turn> { action });
        _repository.Setup(r => r.ListLogByTurnsAsync(CAMPAIGN, It.IsAny<IEnumerable<int>>()))
            .ReturnsAsync(() => new List<Turn> { WhisperedAction(300) });

        var outsider = (await _service.ListAsync(OUTSIDER, CAMPAIGN, null, null, null)).Items.Single();
        (outsider.WhisperHidden, outsider.Whisper, outsider.Description, outsider.CanReact, outsider.CanReply)
            .Should().Be((true, (ChatWhisperInfo?)null, WhisperAudience.MASKED_TEXT, false, false));
        outsider.Text.Should().NotContain("adaga");

        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, 51, DARA_OWNER, false))
            .ReturnsAsync(new List<Turn> { WhisperedAction(300) });
        var target = (await _service.ListAsync(DARA_OWNER, CAMPAIGN, null, null, null)).Items.Single();
        (target.WhisperHidden, target.Description).Should().Be((false, "Escondo a adaga"));
        target.Whisper!.Recipients.Single().Name.Should().Be("Dara");
    }

    [Fact]
    public async Task TurnState_MasksWhisperedActionsForOutsiders_NotForTheMaster()
    {
        SetupWhisperTable();
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(() => new List<Turn> { WhisperedAction(301) });

        var outsider = (await _service.GetStateAsync(OUTSIDER, CAMPAIGN)).Entries.Single();
        (outsider.Description, outsider.WhisperHidden, outsider.Whisper).Should().Be((WhisperAudience.MASKED_TEXT, true, false));

        var master = (await _service.GetStateAsync(MASTER, CAMPAIGN)).Entries.Single();
        (master.Description, master.WhisperHidden, master.Whisper).Should().Be(("Escondo a adaga", false, true));
    }

    [Fact]
    public async Task HiddenWhisper_IsNotFoundForReactionsAndReplies()
    {
        SetupWhisperTable();
        var secret = Turn.Text(CAMPAIGN, MAP, 3, PLAYER, ARIA, "Aria", null, "psiu");
        secret.TurnId = 302;
        secret.MarkWhisper();
        _repository.Setup(r => r.GetByIdAsync(302)).ReturnsAsync(secret);

        await _service.Invoking(s => s.ReactAsync(OUTSIDER, 302, new ChatReactInfo { Kind = "like" })).Should().ThrowAsync<KeyNotFoundException>();
        await _service.Invoking(s => s.DeleteMessageAsync(OUTSIDER, 302)).Should().ThrowAsync<KeyNotFoundException>();
        await _service.Invoking(s => s.SendAsync(MASTER, CAMPAIGN, new ChatSendInfo { Text = "ok", ReplyToTurnId = 302 }))
            .Should().NotThrowAsync("the master sees every whisper");
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, 83)).ReturnsAsync(new CampaignCharacter
            { CampaignId = CAMPAIGN, CharacterId = 83, Status = CampaignCharacterStatus.Approved });
        _characterRepository.Setup(r => r.GetByIdAsync(83)).ReturnsAsync(new Character { CharacterId = 83, UserId = OUTSIDER, Name = "Ivo" });
        await _service.Invoking(s => s.SendAsync(OUTSIDER, CAMPAIGN, new ChatSendInfo { CharacterId = 83, Text = "?", ReplyToTurnId = 302 }))
            .Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task UpdatedWhisperedAction_GoesWholeToTheAudience_AndMaskedToTheOthers()
    {
        SetupWhisperTable();
        _repository.Setup(r => r.GetByIdAsync(303)).ReturnsAsync(() => WhisperedAction(303));
        _repository.Setup(r => r.GetByIdAsync(303)).ReturnsAsync(() => WhisperedAction(303));

        await _service.ReactAsync(MASTER, 303, new ChatReactInfo { Kind = "laugh" });

        _notifier.Verify(n => n.PublishSplitAsync(
            It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED && !((ChatItemInfo)e.Data!).WhisperHidden),
            It.IsAny<IReadOnlyCollection<long>>(),
            It.Is<TableEventInfo>(e => ((ChatItemInfo)e.Data!).WhisperHidden && ((ChatItemInfo)e.Data!).Description == WhisperAudience.MASKED_TEXT)),
            Times.Once);
    }
}
