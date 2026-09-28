using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class TurnServiceTests
{
    private const long MASTER = 1;
    private const long PLAYER = 2;
    private const long STRANGER = 3;
    private const long CAMPAIGN = 10;
    private const long MAP = 30;
    private const long PARTICIPATION = 70;
    private const long ARIA = 80;
    private const long BRAM = 81;
    private const long ARIA_PIECE = 42;
    private const long GOBLIN_PIECE = 43;
    private const long OBJECT_PIECE = 44;
    private const long MAP_NPC = 90;
    private const long NPC = 8;

    private readonly Mock<ITurnRepository<Turn>> _repository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<ICharacterRepository<Character>> _characterRepository = new();
    private readonly Mock<IMapNpcRepository<MapNpc>> _mapNpcRepository = new();
    private readonly Mock<INpcRepository<Npc>> _npcRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Campaign _campaign = new() { CampaignId = CAMPAIGN, UserId = MASTER, Name = "C", CurrentTurn = 3 };
    private readonly MapToken _ariaPiece;
    private readonly TurnService _service;

    public TurnServiceTests()
    {
        _campaignRepository.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(_campaign);
        _mapRepository.Setup(r => r.GetByIdAsync(MAP)).ReturnsAsync(new Map { MapId = MAP, CampaignId = CAMPAIGN, UserId = MASTER, Status = MapStatus.Active });

        _ariaPiece = MapToken.PlaceCharacter(MAP, 5, PARTICIPATION, "Aria", 4, 4);
        _ariaPiece.MapTokenId = ARIA_PIECE;
        var goblin = MapToken.PlaceNpc(MAP, 5, MAP_NPC, "Goblin", 6, 6, 0);
        goblin.MapTokenId = GOBLIN_PIECE;
        var chest = MapToken.PlaceNpc(MAP, 5, MAP_NPC, "Baú", 7, 7, 0);
        chest.MapTokenId = OBJECT_PIECE;
        chest.MapNpcId = null;
        _mapTokenRepository.Setup(r => r.GetByIdAsync(ARIA_PIECE)).ReturnsAsync(_ariaPiece);
        _mapTokenRepository.Setup(r => r.GetByIdAsync(GOBLIN_PIECE)).ReturnsAsync(goblin);
        _mapTokenRepository.Setup(r => r.GetByIdAsync(OBJECT_PIECE)).ReturnsAsync(chest);
        _mapTokenRepository.Setup(r => r.UpdateAsync(It.IsAny<MapToken>())).ReturnsAsync((MapToken t) => t);

        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(PARTICIPATION)).ReturnsAsync(new CampaignCharacter
        {
            CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved
        });
        _characterRepository.Setup(r => r.GetByIdAsync(ARIA)).ReturnsAsync(new Character { CharacterId = ARIA, UserId = PLAYER, Name = "Aria" });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync((IEnumerable<long> ids) =>
            ids.Select(id => new Character { CharacterId = id, Name = id == ARIA ? "Aria" : "Bram" }).ToList());
        _mapNpcRepository.Setup(r => r.GetByIdAsync(MAP_NPC)).ReturnsAsync(new MapNpc { MapNpcId = MAP_NPC, MapId = MAP, NpcId = NPC, Name = "Goblin 1" });
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<MapNpc> { new() { MapNpcId = MAP_NPC, NpcId = NPC, Name = "Goblin 1" } });
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Npc> { new() { NpcId = NPC, Name = "Goblin" } });

        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).ReturnsAsync((Turn t) => t);
        _repository.Setup(r => r.ListByActorTurnAsync(It.IsAny<long>(), It.IsAny<int>(), It.IsAny<long?>(), It.IsAny<long?>())).ReturnsAsync(new List<Turn>());
        _repository.Setup(r => r.ListByCampaignTurnAsync(It.IsAny<long>(), It.IsAny<int>())).ReturnsAsync(new List<Turn>());
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync((IEnumerable<long> ids) => ids.Select(id => new User { UserId = id, Name = $"User {id}" }).ToList());

        _service = new TurnService(_repository.Object, _campaignRepository.Object, _mapRepository.Object, _mapTokenRepository.Object,
            _campaignCharacterRepository.Object, _characterRepository.Object, _mapNpcRepository.Object, _npcRepository.Object, _unitOfWork.Object, _userRepository.Object, _notifier.Object);
    }

    // --- State (US1) ---

    [Fact]
    public async Task GetState_MasterAndApprovedParticipants_OthersDenied()
    {
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, PLAYER)).ReturnsAsync(true);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3))
            .ReturnsAsync(new List<Turn> { Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, 1, "Ataca") });

        var state = await _service.GetStateAsync(MASTER, CAMPAIGN);
        (state.TurnNo, state.Entries.Single().ActorName).Should().Be((3, "Aria"));
        (await _service.GetStateAsync(PLAYER, CAMPAIGN)).Entries.Should().ContainSingle();
        await _service.Invoking(s => s.GetStateAsync(STRANGER, CAMPAIGN)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // --- Act (US2) ---

    [Fact]
    public async Task Act_OwnerOfTheCharacter_RecordsAnActionOfTheCurrentTurn()
    {
        var result = await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Ataca o goblin" });

        (result.TurnType, result.TurnNo, result.CharacterId, result.ActorName, result.Description)
            .Should().Be(((int)TurnType.Action, 3, (long?)ARIA, "Aria", "Ataca o goblin"));
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e =>
            e.Type == TableEventType.TURN_CHANGED && e.CampaignId == CAMPAIGN && e.ActorUserId == PLAYER)), Times.Once);
    }

    [Fact]
    public async Task Act_MasterForANpc_KeepsTheOccurrence()
    {
        var result = await _service.ActAsync(MASTER, new TurnActInfo { MapTokenId = GOBLIN_PIECE, Description = "Rosna" });

        (result.NpcId, result.MapNpcId, result.ActorName).Should().Be(((long?)NPC, (long?)MAP_NPC, "Goblin 1"));
    }

    [Fact]
    public async Task Act_PlayerWithANpcOrAStrangersCharacter_Throws()
    {
        await _service.Invoking(s => s.ActAsync(PLAYER, new TurnActInfo { MapTokenId = GOBLIN_PIECE, Description = "x" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.ActAsync(STRANGER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "x" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Act_WithAnObjectOrWithoutText_Throws()
    {
        await _service.Invoking(s => s.ActAsync(MASTER, new TurnActInfo { MapTokenId = OBJECT_PIECE, Description = "x" }))
            .Should().ThrowAsync<DomainValidationException>();
        await _service.Invoking(s => s.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "  " }))
            .Should().ThrowAsync<DomainValidationException>();
    }

    // --- Finish (US4) ---

    [Fact]
    public async Task Finish_WithPendingCharacters_ListsThemAndKeepsTheTurn()
    {
        SetupApproved(ARIA, BRAM);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3))
            .ReturnsAsync(new List<Turn> { Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, 1, "Ataca") });

        var result = await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo());

        (result.Finished, result.TurnNo).Should().Be((false, 3));
        result.Pending.Should().Equal("Bram");
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
        _campaignRepository.Verify(r => r.UpdateAsync(It.IsAny<Campaign>()), Times.Never);
    }

    [Fact]
    public async Task Finish_Forced_AdvancesAnyway()
    {
        SetupApproved(ARIA);

        var result = await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo { Force = true });

        (result.Finished, result.FinishedTurn, result.TurnNo).Should().Be((true, (int?)3, 4));
        _campaignRepository.Verify(r => r.UpdateAsync(It.Is<Campaign>(c => c.CurrentTurn == 4)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.TURN_FINISHED && e.CampaignId == CAMPAIGN)), Times.Once);
    }

    [Fact]
    public async Task Finish_AllCharactersActed_AdvancesEvenIfNpcsDidNot()
    {
        SetupApproved(ARIA);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn>
        {
            Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, 1, (1, 1, 0), (1, 0, 0)),
            Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, 1, "Ataca")
        });

        (await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo())).Finished.Should().BeTrue();
    }

    [Fact]
    public async Task Finish_MovedButDidNotAct_IsPending()
    {
        SetupApproved(ARIA);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3))
            .ReturnsAsync(new List<Turn> { Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, 1, (1, 1, 0), (1, 0, 0)) });

        (await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo())).Pending.Should().Equal("Aria");
    }

    [Fact]
    public async Task Finish_NotMaster_Throws()
    {
        await _service.Invoking(s => s.FinishAsync(PLAYER, CAMPAIGN, new TurnFinishInfo { Force = true }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // --- Reset (US5) ---

    [Fact]
    public async Task Reset_DeletesTheEntriesAndRevertsTheMove()
    {
        _ariaPiece.MoveTo(4, 2);
        var movement = Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, 1, (4, 4, 3), (4, 2, 0));
        movement.TurnId = 500;
        var action = Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, 1, "Ataca");
        action.TurnId = 501;
        _repository.Setup(r => r.ListByActorTurnAsync(CAMPAIGN, 3, ARIA, null)).ReturnsAsync(new List<Turn> { movement, action });

        var result = await _service.ResetAsync(PLAYER, new TurnPieceInfo { MapTokenId = ARIA_PIECE });

        (result.Removed, result.Reverted).Should().Be((2, true));
        (_ariaPiece.X, _ariaPiece.Y, _ariaPiece.Look).Should().Be((4, 4, 3));
        _repository.Verify(r => r.DeleteRangeAsync(It.Is<IEnumerable<long>>(ids => ids.SequenceEqual(new long[] { 500, 501 }))), Times.Once);
    }

    [Fact]
    public async Task Reset_FormerHexTaken_KeepsThePieceWhereItIs()
    {
        _ariaPiece.MoveTo(4, 2);
        _repository.Setup(r => r.ListByActorTurnAsync(CAMPAIGN, 3, ARIA, null))
            .ReturnsAsync(new List<Turn> { Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, 1, (4, 4, 3), (4, 2, 0)) });
        _mapTokenRepository.Setup(r => r.ExistsAtAsync(MAP, 4, 4, ARIA_PIECE)).ReturnsAsync(true);

        var result = await _service.ResetAsync(PLAYER, new TurnPieceInfo { MapTokenId = ARIA_PIECE });

        (result.Removed, result.Reverted).Should().Be((1, false));
        (_ariaPiece.X, _ariaPiece.Y).Should().Be((4, 2));
        _mapTokenRepository.Verify(r => r.UpdateAsync(It.IsAny<MapToken>()), Times.Never);
    }

    [Fact]
    public async Task Reset_AnotherPlayersCharacter_Throws()
    {
        await _service.Invoking(s => s.ResetAsync(STRANGER, new TurnPieceInfo { MapTokenId = ARIA_PIECE }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.DeleteRangeAsync(It.IsAny<IEnumerable<long>>()), Times.Never);
    }

    // --- Direct entries (US6) ---

    [Fact]
    public async Task Create_ActionResultByTheMaster_DefaultsToTheCurrentTurn()
    {
        var result = await _service.CreateAsync(MASTER, new TurnInsertInfo
        {
            CampaignId = CAMPAIGN, CharacterId = ARIA, TurnType = (int)TurnType.ActionResult, Description = "Acertou: 4 de dano"
        });

        (result.TurnType, result.TurnNo, result.Description).Should().Be(((int)TurnType.ActionResult, 3, "Acertou: 4 de dano"));
    }

    [Fact]
    public async Task Create_InvalidTypeOrMovementWithoutPosition_Throws()
    {
        await _service.Invoking(s => s.CreateAsync(MASTER, new TurnInsertInfo { CampaignId = CAMPAIGN, CharacterId = ARIA, TurnType = 9 }))
            .Should().ThrowAsync<DomainValidationException>();
        await _service.Invoking(s => s.CreateAsync(MASTER, new TurnInsertInfo { CampaignId = CAMPAIGN, CharacterId = ARIA, TurnType = 1 }))
            .Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task CreateAndDelete_NotMaster_Throw()
    {
        _repository.Setup(r => r.GetByIdAsync(500)).ReturnsAsync(new Turn { TurnId = 500, CampaignId = CAMPAIGN });

        await _service.Invoking(s => s.CreateAsync(PLAYER, new TurnInsertInfo { CampaignId = CAMPAIGN, CharacterId = ARIA, TurnType = 2, Description = "x" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.DeleteAsync(PLAYER, 500)).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.DeleteAsync(MASTER, 500);
        _repository.Verify(r => r.DeleteAsync(500), Times.Once);
    }

    private void SetupApproved(params long[] characterIds)
    {
        _campaignCharacterRepository.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(characterIds
            .Select((id, i) => new CampaignCharacter { CampaignCharacterId = 100 + i, CampaignId = CAMPAIGN, CharacterId = id, Status = CampaignCharacterStatus.Approved })
            .ToList());
    }

    // ---- 024: authors, reset keeps character updates ----

    [Fact]
    public async Task Act_And_Create_RecordTheAuthor()
    {
        var acted = await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Ataca" });
        var result = await _service.CreateAsync(MASTER, new TurnInsertInfo
        {
            CampaignId = CAMPAIGN, TurnType = (int)TurnType.ActionResult, CharacterId = ARIA, Description = "Acertou"
        });

        (acted.UserId, acted.UserName).Should().Be((PLAYER, "User 2"));
        result.UserId.Should().Be(MASTER);
    }

    [Fact]
    public async Task Create_CharacterUpdate_IsRefused()
    {
        (await _service.Invoking(s => s.CreateAsync(MASTER, new TurnInsertInfo { CampaignId = CAMPAIGN, TurnType = (int)TurnType.CharacterUpdate, CharacterId = ARIA }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("turnType");
    }

    [Fact]
    public async Task Reset_KeepsTheCharacterUpdates()
    {
        var action = Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Ataca");
        action.TurnId = 601;
        var update = Turn.CharacterUpdate(CAMPAIGN, MAP, ARIA, null, null, 3, MASTER, new[] { new TurnChange("currentLife", "10", "6") });
        update.TurnId = 602;
        _repository.Setup(r => r.ListByActorTurnAsync(CAMPAIGN, 3, ARIA, null)).ReturnsAsync(new List<Turn> { action, update });

        var result = await _service.ResetAsync(PLAYER, new TurnPieceInfo { MapTokenId = ARIA_PIECE });

        result.Removed.Should().Be(1);
        _repository.Verify(r => r.DeleteRangeAsync(It.Is<IEnumerable<long>>(ids => ids.SequenceEqual(new long[] { 601 }))), Times.Once);
    }

    [Fact]
    public async Task Finish_CharacterUpdateIsNotAnAction()
    {
        SetupApproved(ARIA);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn>
        {
            Turn.CharacterUpdate(CAMPAIGN, MAP, ARIA, null, null, 3, MASTER, new[] { new TurnChange("currentLife", "10", "6") })
        });

        (await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo())).Pending.Should().Equal("Aria");
    }

    [Fact]
    public async Task State_ReturnsAuthorsMovedAndChanges()
    {
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn>
        {
            Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, (1, 1, 0), (1, 0, 0), moved: 1),
            Turn.CharacterUpdate(CAMPAIGN, MAP, ARIA, null, null, 3, MASTER, new[] { new TurnChange("currentLife", "10", "6") })
        });

        var state = await _service.GetStateAsync(MASTER, CAMPAIGN);

        (state.Entries[0].UserId, state.Entries[0].Moved).Should().Be((PLAYER, (int?)1));
        state.Entries[1].TurnType.Should().Be((int)TurnType.CharacterUpdate);
        state.Entries[1].Changes!.Single().After.Should().Be("6");
    }

    // ---- 024: summary ----

    [Fact]
    public async Task Summary_WithoutTurnNo_IsTheTurnInProgressWithCurrentPositions()
    {
        _campaign.CurrentMapId = MAP;
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn>
        {
            Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, (4, 5, 3), (4, 4, 0), moved: 4),
            Turn.CharacterUpdate(CAMPAIGN, MAP, ARIA, null, null, 3, MASTER, new[] { new TurnChange("currentLife", "10", "6") }),
            Turn.Action(CAMPAIGN, MAP, null, NPC, MAP_NPC, 3, MASTER, "Grita")
        });
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken> { _ariaPiece });
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved }
        });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<Character> { new() { CharacterId = ARIA, UserId = PLAYER, Name = "Aria" } });

        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, PLAYER)).ReturnsAsync(true);

        var summary = await _service.GetSummaryAsync(PLAYER, CAMPAIGN, null);

        summary.TurnNo.Should().Be(3);
        summary.Markdown.Should().Be(string.Join("\n",
            "## Ações",
            "Aria (User 2): Moveu de (4, 5) olhando para o Sul para (4, 4) olhando para o Norte, gastou 4 pontos de movimento (4)",
            "GM (User 1): Alterou Aria (User 2): Vida de 10 para 6",
            "Goblin 1 (GM): \"Grita\"",
            "## Posições",
            "- Aria (User 2) - (4, 4) - Norte",
            ""));
    }

    [Fact]
    public async Task Summary_FinishedTurn_UsesTheLastMoveUpToIt()
    {
        _campaign.CurrentMapId = MAP;
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 2)).ReturnsAsync(new List<Turn>());
        _repository.Setup(r => r.ListLastMovementsAsync(CAMPAIGN, 2)).ReturnsAsync(new List<Turn>
        {
            Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 2, PLAYER, (1, 1, 0), (1, 2, 3))
        });
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken> { _ariaPiece });
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved }
        });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<Character> { new() { CharacterId = ARIA, UserId = PLAYER, Name = "Aria" } });

        var summary = await _service.GetSummaryAsync(MASTER, CAMPAIGN, 2);

        summary.Markdown.Should().Contain("Nenhuma ação registrada.").And.Contain("- Aria (User 2) - (1, 2) - Sul");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    public async Task Summary_TurnOutOfRange_Throws(int turnNo)
    {
        (await _service.Invoking(s => s.GetSummaryAsync(MASTER, CAMPAIGN, turnNo)).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("turnNo");
    }

    [Fact]
    public async Task Summary_OutsiderIsDenied()
    {
        await _service.Invoking(s => s.GetSummaryAsync(STRANGER, CAMPAIGN, null)).Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
