using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;

namespace Roll6.Tests.Domain.Services;

/// <summary>080: a character of the campaign acts from the chat without a piece (same fixture as the turn tests).</summary>
public partial class TurnServiceTests
{
    private static TurnActInfo ByCharacter(long characterId, string description = "Vasculha a biblioteca") =>
        new() { CampaignId = CAMPAIGN, CharacterId = characterId, Description = description };

    [Fact]
    public async Task Act_ByCharacter_WithoutAPiece_RecordsTheActionOnTheCurrentMap()
    {
        _campaign.CurrentMapId = MAP;

        var result = await _service.ActAsync(PLAYER, ByCharacter(ARIA));

        (result.TurnType, result.TurnNo, result.CharacterId, result.ActorName, result.MapId)
            .Should().Be(((int)TurnType.Action, 3, (long?)ARIA, "Aria", (long?)MAP));
        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == TurnType.Action && t.UserId == PLAYER && t.MapNpcId == null)), Times.Once);
        _mapTokenRepository.Verify(r => r.GetByIdAsync(It.IsAny<long>()), Times.Never);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.TURN_CHANGED)), Times.Once);
        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Action)), Times.Once);
    }

    [Fact]
    public async Task Act_ByCharacter_WithoutACurrentMap_HasNoMap()
    {
        _campaign.CurrentMapId = null;

        var result = await _service.ActAsync(PLAYER, ByCharacter(ARIA));

        result.MapId.Should().BeNull();
    }

    [Fact]
    public async Task Act_ByCharacter_CancelsThePreviousAction()
    {
        var previous = Turn.Action(CAMPAIGN, null, ARIA, null, null, 3, PLAYER, "Antes");
        previous.TurnId = 620;
        _repository.Setup(r => r.ListValidActionsAsync(CAMPAIGN, 3, ARIA, null)).ReturnsAsync(new List<Turn> { previous });

        await _service.ActAsync(PLAYER, ByCharacter(ARIA, "Depois"));

        previous.IsCancelled.Should().BeTrue();
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED)), Times.Once);
    }

    [Fact]
    public async Task Act_ByCharacter_TheMasterMayActForAnyParticipation()
    {
        var result = await _service.ActAsync(MASTER, ByCharacter(ARIA));

        (result.CharacterId, result.UserId).Should().Be(((long?)ARIA, MASTER));
    }

    [Fact]
    public async Task Act_ByCharacter_NotYoursOrNotApproved_Is403_AndUnknownIs404()
    {
        await _service.Invoking(s => s.ActAsync(STRANGER, ByCharacter(ARIA))).Should().ThrowAsync<UnauthorizedAccessException>();

        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, BRAM)).ReturnsAsync(new CampaignCharacter
            { CampaignId = CAMPAIGN, CharacterId = BRAM, Status = CampaignCharacterStatus.RequestedAccess });
        _characterRepository.Setup(r => r.GetByIdAsync(BRAM)).ReturnsAsync(new Character { CharacterId = BRAM, UserId = PLAYER, Name = "Bram" });
        await _service.Invoking(s => s.ActAsync(PLAYER, ByCharacter(BRAM))).Should().ThrowAsync<UnauthorizedAccessException>();

        await _service.Invoking(s => s.ActAsync(PLAYER, ByCharacter(999))).Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Act_ByCharacter_InACampaignThatIsNotActive_Is409()
    {
        _campaign.Status = CampaignStatus.Paused;

        await _service.Invoking(s => s.ActAsync(PLAYER, ByCharacter(ARIA))).Should().ThrowAsync<ConflictException>();
        _campaign.Status = CampaignStatus.Active;
    }

    [Fact]
    public async Task Act_WithNeitherOrBothForms_Is400()
    {
        (await _service.Invoking(s => s.ActAsync(PLAYER, new TurnActInfo { Description = "x" }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("mapTokenId");
        (await _service.Invoking(s => s.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, CampaignId = CAMPAIGN, CharacterId = ARIA, Description = "x" }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("mapTokenId");
        (await _service.Invoking(s => s.ActAsync(PLAYER, new TurnActInfo { CampaignId = CAMPAIGN, Description = "x" }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("mapTokenId");
    }

    [Fact]
    public async Task Act_ByPiece_IsUnchanged()
    {
        var result = await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Ataca" });

        (result.CharacterId, result.MapId).Should().Be(((long?)ARIA, (long?)MAP));
    }
}
