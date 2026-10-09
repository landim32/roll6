using Roll6.Domain.Notifications;
using Roll6.Domain.Interfaces;
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
    private readonly Mock<INotificationQueue> _queue = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<IMapModelRepository<MapModel>> _mapModelRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<ICampaignNpcRepository<CampaignNpc>> _campaignNpcRepository = new();
    private readonly Mock<IChatReadRepository<ChatRead>> _chatReadRepository = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
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

        _campaignCharacterRepository.Setup(r => r.GetAsync(CAMPAIGN, ARIA)).ReturnsAsync(new CampaignCharacter
        {
            CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved
        });
        _campaignNpcRepository.Setup(r => r.GetAsync(CAMPAIGN, NPC)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 5, CampaignId = CAMPAIGN, NpcId = NPC });

        _service = new TurnService(_repository.Object, _campaignRepository.Object, _mapRepository.Object, _mapTokenRepository.Object,
            _campaignCharacterRepository.Object, _characterRepository.Object, _mapNpcRepository.Object, _npcRepository.Object, _unitOfWork.Object, _userRepository.Object, _mapModelRepository.Object, _campaignNpcRepository.Object,
            _tokenRepository.Object, _chatReadRepository.Object, _imageStorage.Object, _queue.Object, _notifier.Object);
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

    // --- Narration (029) ---

    [Fact]
    public async Task GetNarration_WithoutTurnNo_JoinsTheLatestFinishedTurn()
    {
        var first = Turn.Narration(CAMPAIGN, MAP, 1, MASTER, "Os heróis entram.");
        first.CreatedAt = new DateTime(2026, 9, 1, 10, 0, 0, DateTimeKind.Utc);
        var second = Turn.Narration(CAMPAIGN, MAP, 1, MASTER, "A porta se fecha.");
        second.CreatedAt = new DateTime(2026, 9, 1, 11, 0, 0, DateTimeKind.Utc);
        _repository.Setup(r => r.ListNarrationsAsync(CAMPAIGN, null, 3)).ReturnsAsync(new List<Turn> { first, second });

        var result = await _service.GetNarrationAsync(MASTER, CAMPAIGN, null);

        result.Should().NotBeNull();
        result!.TurnNo.Should().Be(1);
        result.Narration.Should().Be("Os heróis entram.\n\nA porta se fecha.");
        result.FinishedAt.Should().Be(second.CreatedAt);
        _repository.Verify(r => r.ListNarrationsAsync(CAMPAIGN, null, _campaign.CurrentTurn), Times.Once);
    }

    [Fact]
    public async Task GetNarration_CurrentTurn_HasNoFinishedAt()
    {
        var live = Turn.Narration(CAMPAIGN, MAP, 3, MASTER, "Ainda em curso.");
        _repository.Setup(r => r.ListNarrationsAsync(CAMPAIGN, 3, 3)).ReturnsAsync(new List<Turn> { live });

        var result = await _service.GetNarrationAsync(MASTER, CAMPAIGN, 3);

        result!.Narration.Should().Be("Ainda em curso.");
        result.FinishedAt.Should().BeNull();
    }

    [Fact]
    public async Task GetNarration_None_ReturnsNull_AndStrangerIsForbidden()
    {
        _repository.Setup(r => r.ListNarrationsAsync(CAMPAIGN, null, 3)).ReturnsAsync(new List<Turn>());

        (await _service.GetNarrationAsync(MASTER, CAMPAIGN, null)).Should().BeNull();
        await _service.Invoking(s => s.GetNarrationAsync(STRANGER, CAMPAIGN, null)).Should().ThrowAsync<UnauthorizedAccessException>();
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
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken>
        {
            _ariaPiece, new() { MapTokenId = 99, MapId = MAP, TokenId = 5, X = 4, Y = 4 }
        });

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
        _repository.Setup(r => r.GetByIdAsync(500)).ReturnsAsync(new Turn { TurnId = 500, CampaignId = CAMPAIGN, TurnType = TurnType.Action });

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
    public async Task Create_CharacterUpdateWithoutChanges_IsRefused()
    {
        (await _service.Invoking(s => s.CreateAsync(MASTER, new TurnInsertInfo { CampaignId = CAMPAIGN, TurnType = (int)TurnType.CharacterUpdate, CharacterId = ARIA }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("changes");
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

    // ---- 027: turn data and processing ----

    private const long BRAM_PARTICIPATION = 71;
    private const long BRAM_PIECE = 45;

    /// <summary>Aria (player's, approved, piece at 4,4) and Bram (master's, approved, piece at 1,1), a goblin occurrence at 6,6.</summary>
    private (MapToken Bram, MapToken Goblin, CampaignCharacter AriaPlay, CampaignCharacter BramPlay, MapNpc Goblin1) Table()
    {
        _campaign.CurrentMapId = MAP;
        _mapRepository.Setup(r => r.GetByIdAsync(MAP)).ReturnsAsync(new Map { MapId = MAP, CampaignId = CAMPAIGN, MapModelId = 50, UserId = MASTER, Status = MapStatus.Active });
        _mapModelRepository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(new MapModel { MapModelId = 50, GridWidth = 10, GridHeight = 10 });
        var ariaPlay = new CampaignCharacter
        {
            CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved,
            CurrentLife = 10, CurrentEnergy = 8, CurrentMove = 4, CharacterStatus = "Agachada", Sheet = "anotação"
        };
        var bramPlay = new CampaignCharacter
        {
            CampaignCharacterId = BRAM_PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = BRAM, Status = CampaignCharacterStatus.Approved,
            CurrentLife = 12, CurrentEnergy = 5
        };
        _campaignCharacterRepository.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter> { ariaPlay, bramPlay });
        _campaignCharacterRepository.Setup(r => r.UpdateAsync(It.IsAny<CampaignCharacter>())).ReturnsAsync((CampaignCharacter c) => c);
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>
        {
            new() { CharacterId = ARIA, UserId = PLAYER, Name = "Aria", Life = 10, Energy = 8, Move = 5 },
            new() { CharacterId = BRAM, UserId = MASTER, Name = "Bram", Life = 12, Energy = 6 }
        });
        var goblin1 = new MapNpc { MapNpcId = MAP_NPC, MapId = MAP, NpcId = NPC, Name = "Goblin 1", CurrentLife = 7, CurrentEnergy = 2 };
        _mapNpcRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapNpc> { goblin1 });
        _mapNpcRepository.Setup(r => r.UpdateAsync(It.IsAny<MapNpc>())).ReturnsAsync((MapNpc m) => m);
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Npc> { new() { NpcId = NPC, Name = "Goblin", Life = 7, Energy = 2 } });
        var bram = MapToken.PlaceCharacter(MAP, 5, BRAM_PARTICIPATION, "Bram", 1, 1);
        bram.MapTokenId = BRAM_PIECE;
        var goblin = MapToken.PlaceNpc(MAP, 5, MAP_NPC, "Goblin 1", 6, 6, 0);
        goblin.MapTokenId = GOBLIN_PIECE;
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken> { _ariaPiece, bram, goblin });
        return (bram, goblin, ariaPlay, bramPlay, goblin1);
    }

    [Fact]
    public async Task Data_ListsCharactersNpcsAndActions()
    {
        Table();
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, PLAYER)).ReturnsAsync(true);
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(new List<Turn> { Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, "Ataca") });

        var data = await _service.GetDataAsync(PLAYER, CAMPAIGN, null);

        (data.TurnNo, data.CurrentTurn, data.MapId).Should().Be((3, 3, (long?)MAP));
        data.Characters.Select(c => (c.Name, c.PlayerName, c.CurrentLife, c.TotalLife, c.CurrentEnergy, c.TotalEnergy, c.Status, c.X, c.Y))
            .Should().Equal(("Aria", "User 2", 10, 10, 8, 8, "Agachada", (int?)4, (int?)4), ("Bram", "User 1", 12, 12, 5, 6, (string?)null, (int?)1, (int?)1));
        data.Characters[0].LookName.Should().NotBeNullOrEmpty();
        data.Npcs.Should().ContainSingle().Which.Should().BeEquivalentTo(new
        {
            MapNpcId = MAP_NPC, NpcId = NPC, MapTokenId = (long?)GOBLIN_PIECE, Name = "Goblin 1", CurrentLife = 7, TotalLife = 7,
            CurrentEnergy = 2, TotalEnergy = 2, X = (int?)6, Y = (int?)6, Look = (int?)0, LookName = "Norte"
        });
        data.Actions.Should().Be("## Ações\nAria (User 2): \"Ataca\"\n");
    }

    [Fact]
    public async Task Data_OutsiderAndOutOfRange_AreRefused()
    {
        await _service.Invoking(s => s.GetDataAsync(STRANGER, CAMPAIGN, null)).Should().ThrowAsync<UnauthorizedAccessException>();
        (await _service.Invoking(s => s.GetDataAsync(MASTER, CAMPAIGN, 9)).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("turnNo");
    }

    [Fact]
    public async Task Process_SavesEverythingLogsItAndFinishesTheTurn()
    {
        var (bram, goblin, ariaPlay, _, goblin1) = Table();
        var inserted = new List<Turn>();
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => inserted.Add(t)).ReturnsAsync((Turn t) => t);

        var result = await _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, CurrentLife = 2, Status = "Caída" } },
            Npcs = new() { new TurnProcessNpcInfo { MapNpcId = MAP_NPC, CurrentLife = -1, ClearStatus = true, X = 6, Y = 5, Look = 0 } },
            Narration = "O goblin acertou Aria e recuou."
        });

        (ariaPlay.CurrentLife, ariaPlay.CharacterStatus, ariaPlay.Sheet).Should().Be((2, "Caída", "anotação"));
        (goblin1.CurrentLife, goblin.X, goblin.Y).Should().Be((-1, 6, 5));
        inserted.Select(t => (t.TurnType, t.UserId, t.TurnNo)).Should().Equal(
            (TurnType.CharacterUpdate, MASTER, 3), (TurnType.CharacterUpdate, MASTER, 3), (TurnType.Movement, MASTER, 3), (TurnType.Narration, MASTER, 3),
            (TurnType.TurnFinished, MASTER, 3));
        inserted[2].Moved.Should().Be(1);
        _campaignRepository.Verify(r => r.UpdateAsync(It.Is<Campaign>(c => c.CurrentTurn == 4)), Times.Once);
        (result.FinishedTurn, result.TurnNo, result.Data.TurnNo).Should().Be((3, 4, 3));
        foreach (var type in new[] { TableEventType.PARTY_CHANGED, TableEventType.MAP_TOKENS_CHANGED, TableEventType.TURN_FINISHED })
            _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == type && e.CampaignId == CAMPAIGN)), Times.Once);
    }

    [Fact]
    public async Task Process_OnlyTheStatus_ChangesOnlyTheStatus()
    {
        var (_, _, ariaPlay, _, _) = Table();
        var inserted = new List<Turn>();
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => inserted.Add(t)).ReturnsAsync((Turn t) => t);

        await _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, Status = "Em pé" } }
        });

        (ariaPlay.CurrentLife, ariaPlay.CurrentEnergy, ariaPlay.CharacterStatus).Should().Be((10, 8, "Em pé"));
        inserted.Single(t => t.IsLog).Changes!.Single().Field.Should().Be("characterStatus");
        inserted.Last().TurnType.Should().Be(TurnType.TurnFinished, "the chat shows where the turn ended (041)");
    }

    [Fact]
    public async Task Process_Posture_ChangesAndLogsIt()
    {
        var (_, _, ariaPlay, _, goblin1) = Table();
        var inserted = new List<Turn>();
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => inserted.Add(t)).ReturnsAsync((Turn t) => t);

        var result = await _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, Posture = (int)Posture.OutOfCombat } },
            Npcs = new() { new TurnProcessNpcInfo { MapNpcId = MAP_NPC, Posture = (int)Posture.Down } }
        });

        (ariaPlay.Posture, goblin1.Posture).Should().Be((Posture.OutOfCombat, Posture.Down));
        inserted.Where(t => t.IsLog).Select(t => t.Changes!.Single().Field).Should().Equal("posture", "posture");
        result.Data.Characters.Single(c => c.CharacterId == ARIA).Posture.Should().Be((int)Posture.OutOfCombat);
    }

    [Fact]
    public async Task Data_CarriesTheDeslocamentoAndTheMove()
    {
        Table();

        var data = await _service.GetDataAsync(MASTER, CAMPAIGN, null);

        var aria = data.Characters.Single(c => c.CharacterId == ARIA);
        (aria.CurrentMove, aria.Move).Should().Be((4, 5));
    }

    [Fact]
    public async Task Process_Deslocamento_ChangesAndLogsIt()
    {
        var (_, _, ariaPlay, _, _) = Table();
        var inserted = new List<Turn>();
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => inserted.Add(t)).ReturnsAsync((Turn t) => t);

        var result = await _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, CurrentMove = 2 } }
        });

        ariaPlay.CurrentMove.Should().Be(2);
        inserted.Single(t => t.IsLog).Changes!.Select(c => (c.Field, c.Before, c.After)).Should().Equal(("currentMove", "4", "2"));
        result.Data.Characters.Single(c => c.CharacterId == ARIA).CurrentMove.Should().Be(2);
    }

    [Fact]
    public async Task Process_PiecesMaySwapHexes()
    {
        var (bram, _, _, _, _) = Table();

        await _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo
        {
            Characters = new()
            {
                new TurnProcessCharacterInfo { CharacterId = ARIA, X = 1, Y = 1 },
                new TurnProcessCharacterInfo { CharacterId = BRAM, X = 4, Y = 4 }
            }
        });

        ((_ariaPiece.X, _ariaPiece.Y), (bram.X, bram.Y)).Should().Be(((1, 1), (4, 4)));
    }

    public static IEnumerable<object[]> InvalidBatches() => new[]
    {
        new object[] { new TurnProcessInfo(), "batch" },
        new object[] { new TurnProcessInfo { Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA }, new TurnProcessCharacterInfo { CharacterId = ARIA } } }, "batch" },
        new object[] { new TurnProcessInfo { Characters = new() { new TurnProcessCharacterInfo { CharacterId = 999, CurrentLife = 1 } } }, "characters[0].characterId" },
        new object[] { new TurnProcessInfo { Npcs = new() { new TurnProcessNpcInfo { MapNpcId = 999, CurrentLife = 1 } } }, "npcs[0].mapNpcId" },
        new object[] { new TurnProcessInfo { Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, CurrentLife = 11 } } }, "characters[0].currentLife" },
        new object[] { new TurnProcessInfo { Npcs = new() { new TurnProcessNpcInfo { MapNpcId = MAP_NPC, CurrentEnergy = 3 } } }, "npcs[0].currentEnergy" },
        new object[] { new TurnProcessInfo { Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, X = 1, Y = 1 } } }, "characters[0].x" },
        new object[] { new TurnProcessInfo { Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, X = 20, Y = 1 } } }, "characters[0].x" },
        new object[] { new TurnProcessInfo { Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, X = 3 } } }, "characters[0].x" },
        new object[] { new TurnProcessInfo { Narration = new string('a', Turn.MAX_NARRATION + 1) }, "narration" },
        new object[] { new TurnProcessInfo { Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, Posture = 5 } } }, "characters[0].posture" },
        new object[] { new TurnProcessInfo { Characters = new() { new TurnProcessCharacterInfo { CharacterId = ARIA, CurrentMove = -1 } } }, "characters[0].currentMove" }
    };

    [Theory]
    [MemberData(nameof(InvalidBatches))]
    public async Task Process_InvalidBatch_ChangesNothing(TurnProcessInfo info, string key)
    {
        Table();

        (await _service.Invoking(s => s.ProcessAsync(MASTER, CAMPAIGN, info)).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey(key);
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
        _campaignRepository.Verify(r => r.UpdateAsync(It.IsAny<Campaign>()), Times.Never);
        _campaign.CurrentTurn.Should().Be(3);
    }

    [Fact]
    public async Task Process_NotMaster_IsForbidden()
    {
        Table();

        await _service.Invoking(s => s.ProcessAsync(PLAYER, CAMPAIGN, new TurnProcessInfo { Narration = "x" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        _campaignRepository.Verify(r => r.UpdateAsync(It.IsAny<Campaign>()), Times.Never);
    }

    [Fact]
    public async Task Process_ResultDataMatchesTheTurnData()
    {
        Table();

        var result = await _service.ProcessAsync(MASTER, CAMPAIGN, new TurnProcessInfo { Narration = "Nada aconteceu." });
        var data = await _service.GetDataAsync(MASTER, CAMPAIGN, result.FinishedTurn);

        result.Data.Should().BeEquivalentTo(data, o => o.Excluding(d => d.Actions));
    }

    // ---- 028: turn history ----

    [Fact]
    public async Task History_OneItemPerNarration_CurrentTurnFirst()
    {
        _campaign.CurrentTurn = 12;
        var at = new DateTime(2026, 9, 28, 20, 0, 0);
        // Turn 11 was closed with two narrations; turn 12 is still being played and already has one.
        var first = Turn.Narration(CAMPAIGN, MAP, 11, MASTER, "Causa 6 de dano");
        var second = Turn.Narration(CAMPAIGN, MAP, 11, MASTER, "A tocha apaga.");
        var open = Turn.Narration(CAMPAIGN, MAP, 12, MASTER, "O turno segue aberto.");
        (first.TurnId, second.TurnId, open.TurnId) = (201, 202, 210);
        (first.CreatedAt, second.CreatedAt, open.CreatedAt) = (at, at.AddHours(1), at.AddHours(2));
        _repository.Setup(r => r.ListByCampaignTurnRangeAsync(CAMPAIGN, 8, 12))
            .ReturnsAsync(new List<Turn> { first, second, open });

        var page = await _service.GetHistoryAsync(MASTER, CAMPAIGN, null, null);

        // Three items, not two: the turn is not the unit of the console, the narration is. Newest entry wins inside a
        // turn, and turns 10 to 8 are absent because they have no narration — the cursor still walks the range.
        page.Items.Select(i => i.TurnId).Should().Equal(210, 202, 201);
        page.Items.Select(i => i.TurnNo).Should().Equal(12, 11, 11);
        (page.CurrentTurn, page.NextBefore).Should().Be((12, (int?)8));
        page.Items.Select(i => i.Actions).Should().Equal(
            "GM (User 1):\n\nO turno segue aberto.",
            "GM (User 1):\n\nA tocha apaga.",
            "GM (User 1):\n\nCausa 6 de dano");
        page.Items[2].FinishedAt.Should().Be(at);
    }

    [Fact]
    public async Task History_ConsoleShowsOnlyNarration()
    {
        _campaign.CurrentTurn = 6;
        _repository.Setup(r => r.ListByCampaignTurnRangeAsync(CAMPAIGN, 2, 6)).ReturnsAsync(new List<Turn>
        {
            Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 5, PLAYER, (1, 1, 0), (2, 1, 0), 1),
            Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 5, PLAYER, "Ataco o goblin"),
            Turn.CharacterUpdate(CAMPAIGN, MAP, ARIA, null, null, 5, PLAYER, new[] { new TurnChange("currentLife", "10", "6") }),
            Turn.ActionResult(CAMPAIGN, MAP, ARIA, null, null, 5, MASTER, "O goblin cai"),
            Turn.Narration(CAMPAIGN, MAP, 5, MASTER, "A tocha apaga."),
            // Turn 4 has an action result and no narration: the console leaves it out entirely.
            Turn.ActionResult(CAMPAIGN, MAP, ARIA, null, null, 4, MASTER, "Leva 3 de dano"),
        });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<Character> { new() { CharacterId = ARIA, UserId = PLAYER, Name = "Aria" } });

        var page = await _service.GetHistoryAsync(MASTER, CAMPAIGN, null, null);

        // The move, the speech, the character change and the action result of the same turn are all left out, and so
        // is the whole of turn 4.
        page.Items.Select(i => i.TurnNo).Should().Equal(5);
        page.NextBefore.Should().Be(2);
        page.Items[0].Actions.Should().Be("GM (User 1):\n\nA tocha apaga.");
    }

    [Fact]
    public async Task History_LastPage_ReachesTurnOne()
    {
        _campaign.CurrentTurn = 12;
        _repository.Setup(r => r.ListByCampaignTurnRangeAsync(CAMPAIGN, 1, 2)).ReturnsAsync(new List<Turn>
        {
            Turn.Narration(CAMPAIGN, MAP, 2, MASTER, "Passo 1"),
            Turn.Narration(CAMPAIGN, MAP, 1, MASTER, "Passo 2"),
        });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<Character> { new() { CharacterId = ARIA, UserId = PLAYER, Name = "Aria" } });

        var page = await _service.GetHistoryAsync(MASTER, CAMPAIGN, 3, 5);

        page.Items.Select(i => i.TurnNo).Should().Equal(2, 1);
        page.NextBefore.Should().BeNull();
    }

    [Fact]
    public async Task History_NoTurnEntryYet_IsEmpty()
    {
        _campaign.CurrentTurn = 1;
        // Turn 1 is being played, so it is asked for — it just has no narration yet, and an empty turn is not listed.
        _repository.Setup(r => r.ListByCampaignTurnRangeAsync(CAMPAIGN, 1, 1)).ReturnsAsync(new List<Turn>());

        var page = await _service.GetHistoryAsync(MASTER, CAMPAIGN, null, null);

        page.Items.Should().BeEmpty();
        page.NextBefore.Should().BeNull();
    }

    [Theory]
    [InlineData(0, 40, 40)]
    [InlineData(50, 21, 40)]
    public async Task History_LimitIsClamped(int limit, int expectedOldest, int expectedNewest)
    {
        _campaign.CurrentTurn = 40;
        _repository.Setup(r => r.ListByCampaignTurnRangeAsync(CAMPAIGN, It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(new List<Turn>());

        await _service.GetHistoryAsync(MASTER, CAMPAIGN, null, limit);

        // The clamp shows in the range of turns asked for; no turn is listed here because none has a narration,
        // which is what the console does with an empty turn.
        _repository.Verify(r => r.ListByCampaignTurnRangeAsync(CAMPAIGN, expectedOldest, expectedNewest), Times.Once);
    }

    [Fact]
    public async Task History_InvalidCursorOrOutsider_AreRefused()
    {
        (await _service.Invoking(s => s.GetHistoryAsync(MASTER, CAMPAIGN, 0, null)).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("before");
        await _service.Invoking(s => s.GetHistoryAsync(STRANGER, CAMPAIGN, null, null)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ---- 030: turn log administration ----

    private void VerifyNothingElseChanged()
    {
        _mapTokenRepository.Verify(r => r.UpdateAsync(It.IsAny<MapToken>()), Times.Never);
        _campaignCharacterRepository.Verify(r => r.UpdateAsync(It.IsAny<CampaignCharacter>()), Times.Never);
        _mapNpcRepository.Verify(r => r.UpdateAsync(It.IsAny<MapNpc>()), Times.Never);
    }

    private void VerifyPublished(string type, Times times) =>
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == type && e.CampaignId == CAMPAIGN)), times);

    [Fact]
    public async Task Create_NarrationInAnOldTurn_HasNoActor()
    {
        var result = await _service.CreateAsync(MASTER, new TurnInsertInfo
        {
            CampaignId = CAMPAIGN, TurnNo = 2, TurnType = (int)TurnType.Narration, MapId = MAP, Description = "O grupo atravessa a ponte."
        });

        (result.TurnType, result.TurnNo, result.CharacterId, result.NpcId, result.MapNpcId, result.UserId)
            .Should().Be(((int)TurnType.Narration, 2, (long?)null, (long?)null, (long?)null, MASTER));
        VerifyPublished(TableEventType.TURN_CHANGED, Times.Once());
        VerifyNothingElseChanged();
    }

    [Fact]
    public async Task Create_NarrationWithAnActor_IsRefused()
    {
        (await _service.Invoking(s => s.CreateAsync(MASTER, new TurnInsertInfo
        {
            CampaignId = CAMPAIGN, TurnType = (int)TurnType.Narration, CharacterId = ARIA, Description = "x"
        })).Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("characterId");
    }

    [Fact]
    public async Task Create_CharacterUpdate_StoresTheChangesOnly()
    {
        var result = await _service.CreateAsync(MASTER, new TurnInsertInfo
        {
            CampaignId = CAMPAIGN, TurnNo = 1, TurnType = (int)TurnType.CharacterUpdate, CharacterId = ARIA,
            Changes = new List<TurnChangeInfo> { new() { Field = "currentLife", Before = "10", After = "6" } }
        });

        result.Changes!.Single().Should().BeEquivalentTo(new TurnChangeInfo { Field = "currentLife", Before = "10", After = "6" });
        VerifyNothingElseChanged();
    }

    [Fact]
    public async Task Create_MovementIgnoresTheOneMoveRule_AndKeepsThePoints()
    {
        _repository.Setup(r => r.ExistsMovementAsync(It.IsAny<long>(), It.IsAny<int>(), It.IsAny<long?>(), It.IsAny<long?>())).ReturnsAsync(true);

        var result = await _service.CreateAsync(MASTER, new TurnInsertInfo
        {
            CampaignId = CAMPAIGN, TurnType = (int)TurnType.Movement, CharacterId = ARIA, BeforeX = 1, BeforeY = 1, BeforeLook = 0,
            X = 2, Y = 2, Look = 3, Moved = 4
        });

        (result.X, result.Moved).Should().Be(((int?)2, (int?)4));
        _repository.Verify(r => r.ExistsMovementAsync(It.IsAny<long>(), It.IsAny<int>(), It.IsAny<long?>(), It.IsAny<long?>()), Times.Never);
        VerifyNothingElseChanged();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    public async Task Create_OutsideOneToCurrent_IsRefused(int turnNo)
    {
        (await _service.Invoking(s => s.CreateAsync(MASTER, new TurnInsertInfo
        {
            CampaignId = CAMPAIGN, TurnNo = turnNo, TurnType = (int)TurnType.Action, CharacterId = ARIA, Description = "x"
        })).Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("turnNo");
    }

    [Fact]
    public async Task Create_ActorOrMapOutsideTheCampaign_IsRefused()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync(new Map { MapId = 99, CampaignId = 77 });
        _mapNpcRepository.Setup(r => r.GetByIdAsync(91)).ReturnsAsync(new MapNpc { MapNpcId = 91, MapId = 99, NpcId = NPC });

        async Task<IDictionary<string, string[]>> Errors(TurnInsertInfo info) =>
            (await _service.Invoking(s => s.CreateAsync(MASTER, info)).Should().ThrowAsync<DomainValidationException>()).Which.Errors;

        (await Errors(new TurnInsertInfo { CampaignId = CAMPAIGN, TurnType = 2, CharacterId = BRAM, Description = "x" })).Should().ContainKey("characterId");
        (await Errors(new TurnInsertInfo { CampaignId = CAMPAIGN, TurnType = 2, NpcId = 55, Description = "x" })).Should().ContainKey("npcId");
        (await Errors(new TurnInsertInfo { CampaignId = CAMPAIGN, TurnType = 2, NpcId = NPC, MapNpcId = 91, Description = "x" })).Should().ContainKey("mapNpcId");
        (await Errors(new TurnInsertInfo { CampaignId = CAMPAIGN, TurnType = 2, CharacterId = ARIA, MapId = 99, Description = "x" })).Should().ContainKey("mapId");
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Create_NpcOccurrenceOfTheCampaign_IsAccepted()
    {
        var result = await _service.CreateAsync(MASTER, new TurnInsertInfo
        {
            CampaignId = CAMPAIGN, TurnType = (int)TurnType.ActionResult, NpcId = NPC, MapNpcId = MAP_NPC, Description = "Foge"
        });

        (result.NpcId, result.MapNpcId).Should().Be(((long?)NPC, (long?)MAP_NPC));
    }

    private Turn SetupEntry(Turn turn, long id = 700)
    {
        turn.TurnId = id;
        _repository.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(turn);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Turn>())).ReturnsAsync((Turn t) => t);
        return turn;
    }

    [Fact]
    public async Task Update_Text_KeepsIdAuthorAndDate()
    {
        var entry = SetupEntry(Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 2, PLAYER, "Ataca"));
        var created = entry.CreatedAt;

        var result = await _service.UpdateAsync(MASTER, 700, new TurnUpdateInfo { Description = "Ataca o orc com a espada" });

        (result.TurnId, result.Description, result.UserId, result.CreatedAt, result.TurnNo)
            .Should().Be((700L, "Ataca o orc com a espada", PLAYER, created, 2));
        _repository.Verify(r => r.UpdateAsync(It.Is<Turn>(t => t.TurnId == 700)), Times.Once);
        VerifyPublished(TableEventType.TURN_CHANGED, Times.Once());
        VerifyNothingElseChanged();
    }

    [Fact]
    public async Task Update_MovementAndTurn_DoesNotMoveThePiece()
    {
        SetupEntry(Turn.Movement(CAMPAIGN, MAP, ARIA, null, null, 3, PLAYER, (1, 1, 0), (2, 2, 3)));

        var result = await _service.UpdateAsync(MASTER, 700, new TurnUpdateInfo { X = 5, Look = 1, TurnNo = 1 });

        (result.X, result.Y, result.Look, result.TurnNo).Should().Be(((int?)5, (int?)2, (int?)1, 1));
        VerifyNothingElseChanged();
    }

    [Fact]
    public async Task Update_InvalidValues_AreRefused_AndNothingIsSaved()
    {
        SetupEntry(Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 2, PLAYER, "Ataca"));
        _mapRepository.Setup(r => r.GetByIdAsync(99)).ReturnsAsync(new Map { MapId = 99, CampaignId = 77 });

        async Task<IDictionary<string, string[]>> Errors(TurnUpdateInfo info) =>
            (await _service.Invoking(s => s.UpdateAsync(MASTER, 700, info)).Should().ThrowAsync<DomainValidationException>()).Which.Errors;

        (await Errors(new TurnUpdateInfo { TurnNo = 4 })).Should().ContainKey("turnNo");
        (await Errors(new TurnUpdateInfo { MapId = 99 })).Should().ContainKey("mapId");
        (await Errors(new TurnUpdateInfo { X = 1 })).Should().ContainKey("x");
        (await Errors(new TurnUpdateInfo { Changes = new List<TurnChangeInfo>() })).Should().ContainKey("changes");
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Update_EmptyBody_KeepsEverything()
    {
        SetupEntry(Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 2, PLAYER, "Ataca"));

        var result = await _service.UpdateAsync(MASTER, 700, new TurnUpdateInfo());

        (result.Description, result.TurnNo, result.MapId).Should().Be(("Ataca", 2, (long?)MAP));
    }

    [Fact]
    public async Task Update_NotMasterOrMissing_Throw()
    {
        SetupEntry(Turn.Action(CAMPAIGN, MAP, ARIA, null, null, 2, PLAYER, "Ataca"));

        await _service.Invoking(s => s.UpdateAsync(PLAYER, 700, new TurnUpdateInfo { Description = "x" })).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.UpdateAsync(STRANGER, 700, new TurnUpdateInfo { Description = "x" })).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.UpdateAsync(MASTER, 999, new TurnUpdateInfo())).Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Delete_AnyTypeOfAnOldTurn_OnlyDeletesTheEntry()
    {
        _repository.Setup(r => r.GetByIdAsync(501)).ReturnsAsync(new Turn { TurnId = 501, CampaignId = CAMPAIGN, TurnNo = 1, TurnType = TurnType.Narration });
        _repository.Setup(r => r.GetByIdAsync(502)).ReturnsAsync(new Turn { TurnId = 502, CampaignId = CAMPAIGN, TurnNo = 2, TurnType = TurnType.CharacterUpdate, CharacterId = ARIA });

        await _service.DeleteAsync(MASTER, 501);
        await _service.DeleteAsync(MASTER, 502);

        _repository.Verify(r => r.DeleteAsync(It.IsIn(501L, 502L)), Times.Exactly(2));
        VerifyNothingElseChanged();
        await _service.Invoking(s => s.DeleteAsync(MASTER, 999)).Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task SetCurrent_Forward_WorksLikeFinishing()
    {
        var result = await _service.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 8 });

        (result.PreviousTurn, result.TurnNo, result.DiscardedEntries).Should().Be((3, 8, 0));
        _campaignRepository.Verify(r => r.UpdateAsync(It.Is<Campaign>(c => c.CurrentTurn == 8)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.TURN_FINISHED
            && e.Data!.ToString()!.Contains("finishedTurn = 7"))), Times.Once);
    }

    [Fact]
    public async Task SetCurrent_SameTurn_DoesNothing()
    {
        var result = await _service.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 3 });

        (result.PreviousTurn, result.TurnNo).Should().Be((3, 3));
        _campaignRepository.Verify(r => r.UpdateAsync(It.IsAny<Campaign>()), Times.Never);
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task SetCurrent_BackWithoutLaterEntries_Saves()
    {
        _repository.Setup(r => r.ListTurnNosAfterAsync(CAMPAIGN, 1)).ReturnsAsync(new List<int>());

        await _service.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 1 });

        _campaignRepository.Verify(r => r.UpdateAsync(It.Is<Campaign>(c => c.CurrentTurn == 1)), Times.Once);
        _repository.Verify(r => r.DeleteAfterTurnAsync(It.IsAny<long>(), It.IsAny<int>()), Times.Never);
        VerifyPublished(TableEventType.TURN_CHANGED, Times.Once());
    }

    [Fact]
    public async Task SetCurrent_BackWithLaterEntries_ConflictsUnlessDiscarding()
    {
        _repository.Setup(r => r.ListTurnNosAfterAsync(CAMPAIGN, 1)).ReturnsAsync(new List<int> { 2, 3 });
        _repository.Setup(r => r.DeleteAfterTurnAsync(CAMPAIGN, 1)).ReturnsAsync(7);

        (await _service.Invoking(s => s.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 1 }))
            .Should().ThrowAsync<ConflictException>()).Which.Message.Should().Contain("2, 3");
        _campaignRepository.Verify(r => r.UpdateAsync(It.IsAny<Campaign>()), Times.Never);
        _campaign.CurrentTurn.Should().Be(3);

        var result = await _service.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 1, DiscardLaterEntries = true });

        (result.PreviousTurn, result.TurnNo, result.DiscardedEntries).Should().Be((3, 1, 7));
        _unitOfWork.Verify(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>()), Times.Once);
        _repository.Verify(r => r.DeleteAfterTurnAsync(CAMPAIGN, 1), Times.Once);
        _campaignRepository.Verify(r => r.UpdateAsync(It.Is<Campaign>(c => c.CurrentTurn == 1)), Times.Once);
        VerifyPublished(TableEventType.TURN_CHANGED, Times.Once());
    }

    [Fact]
    public async Task SetCurrent_InvalidTurnNotMasterOrMissingCampaign_Throw()
    {
        (await _service.Invoking(s => s.SetCurrentAsync(MASTER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 0 }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("turnNo");
        await _service.Invoking(s => s.SetCurrentAsync(PLAYER, CAMPAIGN, new TurnSetCurrentInfo { TurnNo = 5 })).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.SetCurrentAsync(MASTER, 999, new TurnSetCurrentInfo { TurnNo = 5 })).Should().ThrowAsync<KeyNotFoundException>();
    }

    // --- Notices (043) ---

    private void ThreePlayers(params long[] actedCharacterIds)
    {
        // Aria (PLAYER), Bram (user 5) and Cael (user 6) approved; the given characters already acted this turn.
        _campaignCharacterRepository.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignId = CAMPAIGN, CharacterId = ARIA, Status = CampaignCharacterStatus.Approved },
            new() { CampaignId = CAMPAIGN, CharacterId = BRAM, Status = CampaignCharacterStatus.Approved },
            new() { CampaignId = CAMPAIGN, CharacterId = 82, Status = CampaignCharacterStatus.Approved }
        });
        var owners = new Dictionary<long, long> { [ARIA] = PLAYER, [BRAM] = 5, [82] = 6 };
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync((IEnumerable<long> ids) =>
            ids.Select(id => new Character { CharacterId = id, UserId = owners[id], Name = $"C{id}" }).ToList());
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync((IEnumerable<long> ids) =>
            ids.Select(id => new User { UserId = id, Name = id == 5 ? "Bruno Lima" : id == 6 ? "Caio Reis" : "Ana" }).ToList());
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(actedCharacterIds
            .Select(c => new Turn { CampaignId = CAMPAIGN, TurnNo = 3, TurnType = TurnType.Action, CharacterId = c }).ToList());
        _campaignRepository.Setup(r => r.TrySetMajorityNotifiedAsync(CAMPAIGN, 3)).ReturnsAsync(true);
    }

    [Fact]
    public async Task Act_NotifiesTheMasterOnly_WithTheActionText()
    {
        ThreePlayers(ARIA);

        await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Ataco o **orc**" });

        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Action && n.Body == "Ataco o orc"
            && n.Speaker == "Aria" && n.TargetUserIds!.SequenceEqual(new[] { MASTER }) && n.ActorUserId == PLAYER)), Times.Once);
    }

    [Fact]
    public async Task Act_ThatMakesTheMajority_TellsWhoIsMissing()
    {
        // 3 characters → majority 2: Bram already acted, now Aria acts.
        ThreePlayers(BRAM, ARIA);

        await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Defendo" });

        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Majority
            && n.TargetUserIds!.SequenceEqual(new[] { 6L }) && n.BodyFor(6) == "Falta apenas você")), Times.Once);
    }

    [Fact]
    public async Task Act_AfterTheMajorityWasSent_DoesNotRepeat()
    {
        ThreePlayers(BRAM, ARIA);
        _campaign.MajorityNotifiedTurn = 3;

        await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Defendo" });

        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Majority)), Times.Never);
        _campaign.MajorityNotifiedTurn = null;
    }

    [Fact]
    public async Task Act_BelowTheMajority_TellsNobodyButTheMaster()
    {
        ThreePlayers(ARIA);

        await _service.ActAsync(PLAYER, new TurnActInfo { MapTokenId = ARIA_PIECE, Description = "Ando" });

        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Majority)), Times.Never);
    }

    [Fact]
    public async Task Finish_TellsThePlayersTheTurnEnded()
    {
        ThreePlayers(ARIA, BRAM, 82);

        await _service.FinishAsync(MASTER, CAMPAIGN, new TurnFinishInfo { Force = true });

        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.TurnFinished
            && n.Body == "Turno 3 terminado. Pode agir novamente" && n.TargetUserIds!.OrderBy(u => u).SequenceEqual(new[] { PLAYER, 5L, 6L }))), Times.Once);
        _campaign.CurrentTurn = 3;
    }
}
