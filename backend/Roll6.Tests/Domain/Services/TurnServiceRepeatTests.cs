using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;

using Roll6.DTO.Turn;

namespace Roll6.Tests.Domain.Services;

/// <summary>099: "Ação repetida" — set/remove, applied now (Q2 = A), at every turn start, cleared by another action or by the batch.</summary>
public partial class TurnServiceTests
{
    private CampaignCharacter AriaPlay(string? repeated = null) => new()
    {
        CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved,
        RepeatedAction = repeated, RepeatedActionUserId = repeated == null ? null : PLAYER
    };

    private List<Turn> CaptureInserts()
    {
        var inserted = new List<Turn>();
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).ReturnsAsync((Turn t) => { inserted.Add(t); return t; });
        return inserted;
    }

    [Fact]
    public async Task SetRepeated_WithoutAnActionInTheTurn_RecordsItNowAsDeclared()
    {
        var play = AriaPlay();
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, ARIA)).ReturnsAsync(play);
        var inserted = CaptureInserts();

        var result = await _service.SetRepeatedAsync(PLAYER, new TurnRepeatInfo { MapTokenId = ARIA_PIECE, Description = "  Ataco até o orc cair  " });

        (result.Active, result.Description).Should().Be((true, "Ataco até o orc cair"));
        (play.RepeatedAction, play.RepeatedActionUserId).Should().Be(("Ataco até o orc cair", PLAYER));
        var action = inserted.Single();
        (action.TurnType, action.Repeated, action.CharacterId, action.TurnNo, action.Description)
            .Should().Be((TurnType.Action, RepeatSource.Declared, ARIA, 3, "Ataco até o orc cair"));
        result.Applied!.Repeated.Should().Be("declared");
        _campaignCharacterRepository.Verify(r => r.UpdateAsync(play), Times.Once);
    }

    [Fact]
    public async Task SetRepeated_WhenTheActorAlreadyActed_StartsNextTurn()
    {
        var play = AriaPlay();
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, ARIA)).ReturnsAsync(play);
        _repository.Setup(r => r.ListValidActionsAsync(CAMPAIGN, 3, ARIA, null))
            .ReturnsAsync(new List<Turn> { Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Ando") });
        var inserted = CaptureInserts();

        var result = await _service.SetRepeatedAsync(PLAYER, new TurnRepeatInfo { MapTokenId = ARIA_PIECE, Description = "Ataco" });

        result.Applied.Should().BeNull();
        inserted.Should().BeEmpty();
        play.RepeatedAction.Should().Be("Ataco");
    }

    [Fact]
    public async Task SetRepeated_Empty_Removes_InAnyStatus()
    {
        var play = AriaPlay("Ataco");
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, ARIA)).ReturnsAsync(play);
        _campaign.Status = CampaignStatus.Paused;

        var result = await _service.SetRepeatedAsync(PLAYER, new TurnRepeatInfo { MapTokenId = ARIA_PIECE, Description = "  " });

        result.Active.Should().BeFalse();
        play.RepeatedAction.Should().BeNull();
        await _service.Invoking(s => s.SetRepeatedAsync(PLAYER, new TurnRepeatInfo { MapTokenId = ARIA_PIECE, Description = "Ataco" }))
            .Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task SetRepeated_StrangerOrTooLong_IsRefused()
    {
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, ARIA)).ReturnsAsync(AriaPlay());
        await _service.Invoking(s => s.SetRepeatedAsync(STRANGER, new TurnRepeatInfo { MapTokenId = ARIA_PIECE, Description = "x" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.SetRepeatedAsync(PLAYER, new TurnRepeatInfo { MapTokenId = ARIA_PIECE, Description = new string('a', 2001) }))
            .Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Act_ClearsTheRepeatedAction()
    {
        var play = AriaPlay("Ataco");
        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, ARIA)).ReturnsAsync(play);

        await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Fujo" });

        play.RepeatedAction.Should().BeNull();
        _campaignCharacterRepository.Verify(r => r.UpdateAsync(play), Times.Once);
    }

    [Fact]
    public async Task Finish_AppliesEveryRepetitionToTheNewTurn()
    {
        _campaign.CurrentMapId = MAP;
        _campaignCharacterRepository.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter> { AriaPlay("Ataco") });
        _campaignCharacterRepository.Setup(r => r.ListRepeatingAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignCharacter> { AriaPlay("Ataco") });
        _mapNpcRepository.Setup(r => r.ListRepeatingAsync(CAMPAIGN)).ReturnsAsync(new List<MapNpc>
        {
            new() { MapNpcId = MAP_NPC, MapId = 31, NpcId = NPC, Name = "Goblin 1", RepeatedAction = "Rosna", RepeatedActionUserId = MASTER }
        });
        var inserted = CaptureInserts();

        var result = await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo { Force = true });

        result.Finished.Should().BeTrue();
        var actions = inserted.Where(t => t.TurnType == TurnType.Action).ToList();
        actions.Should().HaveCount(2);
        actions.Should().OnlyContain(a => a.Repeated == RepeatSource.TurnStart && a.TurnNo == 4);
        var aria = actions.Single(a => a.CharacterId == ARIA);
        (aria.UserId, aria.MapId, aria.Description).Should().Be((PLAYER, MAP, "Ataco"));
        var goblin = actions.Single(a => a.MapNpcId == MAP_NPC);
        (goblin.UserId, goblin.MapId, goblin.NpcId).Should().Be((MASTER, 31L, NPC));
    }

    [Fact]
    public async Task SetCurrentForward_AppliesOnceForTheTurnReached()
    {
        _campaignCharacterRepository.Setup(r => r.ListRepeatingAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignCharacter> { AriaPlay("Ataco") });
        var inserted = CaptureInserts();

        await _service.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 6 });

        inserted.Where(t => t.TurnType == TurnType.Action).Should().ContainSingle().Which.TurnNo.Should().Be(6);
    }

    [Fact]
    public async Task Gm_DoesNotRunATurnMadeOnlyOfAutomaticRepeatedActions()
    {
        _campaign.GmMode = true;
        _gmDispatcher.Setup(d => d.IsAgentConnected(MASTER)).Returns(true);
        _campaignCharacterRepository.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter> { AriaPlay("Ataco") });
        var automatic = Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Ataco", null, RepeatSource.TurnStart);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn> { automatic });

        await _service.CheckAsync(CAMPAIGN, "test");
        _gmDispatcher.Verify(d => d.EnqueueAsync(It.IsAny<GmJob>()), Times.Never);

        var declared = Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Ataco", null, RepeatSource.Declared);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn> { declared });
        await _service.CheckAsync(CAMPAIGN, "test");
        _gmDispatcher.Verify(d => d.EnqueueAsync(It.IsAny<GmJob>()), Times.Once);
    }
    [Fact]
    public async Task Process_ClearRepeatedAction_IsNotAppliedToTheNextTurn()
    {
        var (_, _, ariaPlay, bramPlay, _) = Table();
        ariaPlay.RepeatedAction = "Ataco até o goblin cair";
        ariaPlay.RepeatedActionUserId = PLAYER;
        bramPlay.RepeatedAction = "Defendo a porta";
        bramPlay.RepeatedActionUserId = MASTER;
        _campaignCharacterRepository.Setup(r => r.ListRepeatingAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignCharacter> { ariaPlay, bramPlay });
        var inserted = CaptureInserts();

        await _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, ClearRepeatedAction = true } },
            Narration = "O goblin caiu."
        });

        ariaPlay.RepeatedAction.Should().BeNull();
        _campaignCharacterRepository.Verify(r => r.UpdateAsync(ariaPlay), Times.Once);
        inserted.Where(t => t.TurnType == TurnType.Action).Should().ContainSingle()
            .Which.Should().Match<Turn>(a => a.CharacterId == BRAM && a.Repeated == RepeatSource.TurnStart && a.TurnNo == 4);
    }
}
