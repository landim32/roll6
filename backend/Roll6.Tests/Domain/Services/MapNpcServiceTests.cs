using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.MapNpc;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class MapNpcServiceTests
{
    private const long MASTER = 1;
    private const long PLAYER = 2;
    private const long STRANGER = 3;
    private const long CAMPAIGN = 10;
    private const long MAP = 30;
    private const long NPC = 8;

    private readonly Mock<ITurnRepository<Turn>> _turnRepository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<IMapNpcRepository<MapNpc>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<IMapModelRepository<MapModel>> _mapModelRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<INpcRepository<Npc>> _npcRepository = new();
    private readonly Mock<ICampaignNpcRepository<CampaignNpc>> _campaignNpcRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly List<MapToken> _insertedPieces = new();
    private readonly MapNpcService _service;
    private long _nextId = 90;

    public MapNpcServiceTests()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(MAP)).ReturnsAsync(new Map { MapId = MAP, CampaignId = CAMPAIGN, MapModelId = 50, UserId = MASTER, Status = MapStatus.Active });
        _mapModelRepository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(new MapModel { MapModelId = 50, GridWidth = 10, GridHeight = 8 });
        _npcRepository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(new Npc { NpcId = NPC, UserId = MASTER, TokenId = 5, Name = "Goblin", Life = 7, Energy = 2 });
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<Npc> { new() { NpcId = NPC, UserId = MASTER, TokenId = 5, Name = "Goblin", Life = 7, Energy = 2 } });
        _campaignNpcRepository.Setup(r => r.GetAsync(CAMPAIGN, NPC)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC });
        _repository.Setup(r => r.InsertAsync(It.IsAny<MapNpc>())).ReturnsAsync((MapNpc m) => { m.MapNpcId = _nextId++; return m; });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<MapNpc>())).ReturnsAsync((MapNpc m) => m);
        _mapTokenRepository.Setup(r => r.InsertAsync(It.IsAny<MapToken>())).ReturnsAsync((MapToken t) => { _insertedPieces.Add(t); return t; });
        _mapTokenRepository.Setup(r => r.ListByMapNpcIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(() => _insertedPieces.ToList());
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token> { new() { TokenId = 5 } });
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _campaignRepository.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(new Campaign { CampaignId = CAMPAIGN, UserId = MASTER, CurrentTurn = 4 });
        _service = new MapNpcService(_repository.Object, _mapRepository.Object, _mapModelRepository.Object, _mapTokenRepository.Object,
            _npcRepository.Object, _campaignNpcRepository.Object, _campaignCharacterRepository.Object, _tokenRepository.Object,
            _unitOfWork.Object, Mock.Of<IImageStorageAppService>(), _turnRepository.Object, _campaignRepository.Object, _notifier.Object);
    }

    private static MapNpcInsertInfo At(int x, int y) => new() { MapId = MAP, NpcId = NPC, X = x, Y = y };

    [Fact]
    public async Task Create_Master_CreatesTheOccurrenceAndItsNpcPiece()
    {
        var result = await _service.CreateAsync(MASTER, At(2, 3));

        (result.Name, result.CurrentLife, result.CurrentEnergy, result.TotalLife, result.TotalEnergy, result.Status, result.X, result.Y, result.TokenId)
            .Should().Be(("Goblin", 7, 2, 7, 2, (string?)null, (int?)2, (int?)3, (long?)5));
        var piece = _insertedPieces.Single();
        (piece.TokenType, piece.MapNpcId, piece.TokenId).Should().Be((MapTokenType.Npc, (long?)result.MapNpcId, 5L));
    }

    [Fact]
    public async Task Create_TwiceTheSameNpc_TwoOccurrences()
    {
        var first = await _service.CreateAsync(MASTER, At(1, 1));
        var second = await _service.CreateAsync(MASTER, At(2, 1));

        first.MapNpcId.Should().NotBe(second.MapNpcId);
        _insertedPieces.Should().HaveCount(2);
    }

    [Fact]
    public async Task Create_NpcOutsideTheCampaign_Throws()
    {
        _campaignNpcRepository.Setup(r => r.GetAsync(CAMPAIGN, NPC)).ReturnsAsync((CampaignNpc?)null);

        await _service.Invoking(s => s.CreateAsync(MASTER, At(1, 1))).Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<MapNpc>()), Times.Never);
    }

    [Fact]
    public async Task Create_OnOccupiedHexOrOutsideTheGrid_Throws()
    {
        _mapTokenRepository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 99, MapId = MAP, TokenId = 1, X = 1, Y = 1 } });

        await _service.Invoking(s => s.CreateAsync(MASTER, At(1, 1))).Should().ThrowAsync<ConflictException>();
        await _service.Invoking(s => s.CreateAsync(MASTER, At(10, 0))).Should().ThrowAsync<DomainValidationException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<MapNpc>()), Times.Never);
    }

    [Fact]
    public async Task Create_NotMaster_Throws()
    {
        await _service.Invoking(s => s.CreateAsync(PLAYER, At(1, 1))).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Update_ChangesOnlyTheOccurrence()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin", CurrentLife = 7 });

        var result = await _service.UpdateAsync(MASTER, 90, new MapNpcUpdateInfo { Name = "Goblin 2", CurrentLife = -1, CurrentEnergy = 0, Status = "caído" });

        (result.Name, result.CurrentLife, result.TotalLife, result.Status).Should().Be(("Goblin 2", -1, 7, "caído"));
        _npcRepository.Verify(r => r.UpdateAsync(It.IsAny<Npc>()), Times.Never);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e =>
            e.Type == TableEventType.MAP_TOKENS_CHANGED && e.CampaignId == CAMPAIGN && e.MapId == MAP)), Times.Once);
    }

    [Fact]
    public async Task Update_NotMaster_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin" });

        await _service.Invoking(s => s.UpdateAsync(PLAYER, 90, new MapNpcUpdateInfo { Name = "X" })).Should().ThrowAsync<UnauthorizedAccessException>();
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task List_MasterAndApprovedParticipants()
    {
        _repository.Setup(r => r.ListByMapAsync(MAP)).ReturnsAsync(new List<MapNpc> { new() { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin" } });
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, PLAYER)).ReturnsAsync(true);

        (await _service.ListByMapAsync(MASTER, MAP)).Should().ContainSingle();
        (await _service.ListByMapAsync(PLAYER, MAP)).Should().ContainSingle();
        await _service.Invoking(s => s.ListByMapAsync(STRANGER, MAP)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Delete_RemovesThePieceAndTheOccurrence()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin" });

        await _service.DeleteAsync(MASTER, 90);

        _mapTokenRepository.Verify(r => r.DeleteByMapNpcIdsAsync(It.Is<IEnumerable<long>>(ids => ids.Single() == 90)), Times.Once);
        _repository.Verify(r => r.DeleteAsync(90), Times.Once);
    }

    // ---- 024: NPC occurrence updates in the turn ----

    [Fact]
    public async Task Update_RecordsACharacterUpdateForTheOccurrence()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin", CurrentLife = 7, CurrentEnergy = 2 });
        Turn? recorded = null;
        _turnRepository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => recorded = t).ReturnsAsync((Turn t) => t);

        await _service.UpdateAsync(MASTER, 90, new MapNpcUpdateInfo { Name = "Goblin", CurrentLife = 3, CurrentEnergy = 2, Status = "Assustado" });

        (recorded!.TurnType, recorded.UserId, recorded.NpcId, recorded.MapNpcId, recorded.TurnNo, recorded.MapId)
            .Should().Be((TurnType.CharacterUpdate, MASTER, (long?)NPC, (long?)90, 4, (long?)MAP));
        recorded.Changes!.Select(c => c.Field).Should().Equal("currentLife", "status");
    }

    [Fact]
    public async Task Update_WithoutChanges_RecordsNothing()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin", CurrentLife = 7, CurrentEnergy = 2 });

        await _service.UpdateAsync(MASTER, 90, new MapNpcUpdateInfo { Name = "Goblin", CurrentLife = 7, CurrentEnergy = 2 });

        _turnRepository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    // ---- 026: current vitals with the NPC's totals ----

    [Fact]
    public async Task Update_AboveTheNpcTotal_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin", CurrentLife = 7, CurrentEnergy = 2 });

        (await _service.Invoking(s => s.UpdateAsync(MASTER, 90, new MapNpcUpdateInfo { Name = "Goblin", CurrentLife = 8, CurrentEnergy = 2 }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("currentLife");
        _repository.Verify(r => r.UpdateAsync(It.IsAny<MapNpc>()), Times.Never);
    }

    // ---- 031: posture ----

    [Fact]
    public async Task Update_WithPosture_ChangesItAndRecordsIt()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin", CurrentLife = 7, CurrentEnergy = 2 });
        Turn? recorded = null;
        _turnRepository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => recorded = t).ReturnsAsync((Turn t) => t);

        var result = await _service.UpdateAsync(MASTER, 90, new MapNpcUpdateInfo { Name = "Goblin", CurrentLife = 7, CurrentEnergy = 2, Posture = 3 });

        result.Posture.Should().Be(3);
        recorded!.Changes!.Should().ContainSingle(c => c.Field == "posture" && c.Before == "1" && c.After == "3");
    }

    [Fact]
    public async Task Update_WithoutPosture_KeepsIt()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin", CurrentLife = 7, CurrentEnergy = 2, Posture = Posture.Down });

        var result = await _service.UpdateAsync(MASTER, 90, new MapNpcUpdateInfo { Name = "Goblin", CurrentLife = 7, CurrentEnergy = 2 });

        result.Posture.Should().Be(2);
        _turnRepository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Create_NpcRegisteredDown_StartsDown()
    {
        _npcRepository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(new Npc { NpcId = NPC, UserId = MASTER, TokenId = 5, Name = "Goblin", Life = 7, Energy = 2, Posture = Posture.Down });

        var result = await _service.CreateAsync(MASTER, At(5, 4));

        result.Posture.Should().Be((int)Posture.Down);
    }

    [Fact]
    public async Task Create_NpcRegisteredDown_NeedsTheRoomOfItsDownSize()
    {
        // Standing it takes 1 hex and would fit in the corner; lying down it takes 7, which do not.
        _tokenRepository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, Name = "Goblin", UpSpace = 1, DownSpace = 7 });
        _npcRepository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(new Npc { NpcId = NPC, UserId = MASTER, TokenId = 5, Name = "Goblin", Life = 7, Energy = 2, Posture = Posture.Down });

        (await _service.Invoking(s => s.CreateAsync(MASTER, At(0, 0))).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("x");
        _repository.Verify(r => r.InsertAsync(It.IsAny<MapNpc>()), Times.Never);

        // The same corner is fine for the same NPC standing.
        _npcRepository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(new Npc { NpcId = NPC, UserId = MASTER, TokenId = 5, Name = "Goblin", Life = 7, Energy = 2 });
        (await _service.CreateAsync(MASTER, At(0, 0))).Posture.Should().Be((int)Posture.Standing);
    }

    [Fact]
    public async Task Create_BigNpcToken_NeedsTheWholeShapeInsideTheGrid()
    {
        _tokenRepository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, Name = "Dragão", UpSpace = 7 });

        (await _service.Invoking(s => s.CreateAsync(MASTER, At(0, 2))).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("x");
        _repository.Verify(r => r.InsertAsync(It.IsAny<MapNpc>()), Times.Never);
    }
}
