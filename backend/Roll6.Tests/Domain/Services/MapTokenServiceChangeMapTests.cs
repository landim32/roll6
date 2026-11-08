using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.MapToken;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

/// <summary>"Mudar de mapa" (111): the master takes a character or NPC piece to the same place of another map.</summary>
public class MapTokenServiceChangeMapTests
{
    private readonly Mock<ITurnRepository<Turn>> _turnRepository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<IMapModelRepository<MapModel>> _mapModelRepository = new();
    private readonly Mock<ICharacterRepository<Character>> _characterRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IMapNpcRepository<MapNpc>> _mapNpcRepository = new();
    private readonly Mock<INpcRepository<Npc>> _npcRepository = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<IWeaponRepository<Weapon>> _weaponRepository = new();
    private readonly Mock<ITokenWeaponRepository<TokenWeapon>> _tokenWeaponRepository = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
    private readonly Mock<ICampaignNpcRepository<CampaignNpc>> _campaignNpcRepository = new();
    private readonly MapTokenService _service;

    private const long MASTER = 1;
    private const long PLAYER = 2;
    private const long CAMPAIGN = 10;
    private const long MAP_A = 30;
    private const long MAP_B = 31;
    private const long SMALL = 32;
    private const long ARCHIVED = 33;
    private const long OTHER_CAMPAIGN_MAP = 34;
    private const long PARTICIPATION = 70;
    private const long CHARACTER = 80;
    private const long CHARACTER_PIECE = 40;
    private const long NPC_PIECE = 41;
    private const long OBJECT_PIECE = 42;
    private const long INSTANCE = 90;
    private const long NPC = 8;

    private readonly Campaign _campaign = new() { CampaignId = CAMPAIGN, UserId = MASTER, Name = "C", CurrentTurn = 3, Status = CampaignStatus.Active };
    private readonly MapToken _characterPiece = new() { MapTokenId = CHARACTER_PIECE, MapId = MAP_A, TokenId = 6, CampaignCharacterId = PARTICIPATION, Name = "Aria", X = 5, Y = 3, Look = 2, WalkX = 10, WalkY = 20, WalkYaw = 1 };
    private readonly MapToken _npcPiece = new() { MapTokenId = NPC_PIECE, MapId = MAP_A, TokenId = 5, MapNpcId = INSTANCE, Name = "Guarda 2", X = 2, Y = 4, Look = 1 };
    private readonly MapNpc _instance = new() { MapNpcId = INSTANCE, MapId = MAP_A, NpcId = NPC, Name = "Guarda 2", CurrentLife = 3, CurrentEnergy = 1, Status = "ferido", Posture = Posture.Down, CurrentMove = 4, RepeatedAction = "ataca", RepeatedActionUserId = MASTER };
    private List<MapToken> _piecesOnB = new();
    private List<MapNpc> _instancesOnB = new();

    public MapTokenServiceChangeMapTests()
    {
        Map MapOf(long id, long campaignId = CAMPAIGN, long model = 50, MapStatus status = MapStatus.Active) =>
            new() { MapId = id, CampaignId = campaignId, MapModelId = model, UserId = MASTER, Status = status, Name = $"Mapa {id}" };
        _mapRepository.Setup(r => r.GetByIdAsync(MAP_A)).ReturnsAsync(MapOf(MAP_A));
        _mapRepository.Setup(r => r.GetByIdAsync(MAP_B)).ReturnsAsync(MapOf(MAP_B));
        _mapRepository.Setup(r => r.GetByIdAsync(SMALL)).ReturnsAsync(MapOf(SMALL, model: 51));
        _mapRepository.Setup(r => r.GetByIdAsync(ARCHIVED)).ReturnsAsync(MapOf(ARCHIVED, status: MapStatus.Archived));
        _mapRepository.Setup(r => r.GetByIdAsync(OTHER_CAMPAIGN_MAP)).ReturnsAsync(MapOf(OTHER_CAMPAIGN_MAP, campaignId: 99));
        _mapModelRepository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(new MapModel { MapModelId = 50, GridWidth = 10, GridHeight = 8 });
        _mapModelRepository.Setup(r => r.GetByIdAsync(51)).ReturnsAsync(new MapModel { MapModelId = 51, GridWidth = 4, GridHeight = 4 });
        _campaignRepository.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(_campaign);

        _repository.Setup(r => r.GetByIdAsync(CHARACTER_PIECE)).ReturnsAsync(_characterPiece);
        _repository.Setup(r => r.GetByIdAsync(NPC_PIECE)).ReturnsAsync(_npcPiece);
        _repository.Setup(r => r.GetByIdAsync(OBJECT_PIECE)).ReturnsAsync(new MapToken { MapTokenId = OBJECT_PIECE, MapId = MAP_A, TokenId = 5, Name = "Baú" });
        _repository.Setup(r => r.ListByMapAsync(It.IsAny<long>())).ReturnsAsync((long id) => id == MAP_B ? _piecesOnB : new List<MapToken>());
        _repository.Setup(r => r.UpdateAsync(It.IsAny<MapToken>())).ReturnsAsync((MapToken t) => t);

        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(PARTICIPATION)).ReturnsAsync(new CampaignCharacter
        {
            CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = CHARACTER, Status = CampaignCharacterStatus.Approved
        });
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter>());
        _characterRepository.Setup(r => r.GetByIdAsync(CHARACTER)).ReturnsAsync(new Character { CharacterId = CHARACTER, UserId = PLAYER, Name = "Aria" });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>());

        _mapNpcRepository.Setup(r => r.GetByIdAsync(INSTANCE)).ReturnsAsync(_instance);
        _mapNpcRepository.Setup(r => r.ListByMapAsync(It.IsAny<long>())).ReturnsAsync((long id) => id == MAP_B ? _instancesOnB : new List<MapNpc>());
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(() => new List<MapNpc> { _instance });
        _mapNpcRepository.Setup(r => r.UpdateAsync(It.IsAny<MapNpc>())).ReturnsAsync((MapNpc m) => m);
        _npcRepository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(new Npc { NpcId = NPC, Name = "Guarda", TokenId = 5, Life = 8, Energy = 4 });
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Npc> { new() { NpcId = NPC, Name = "Guarda", TokenId = 5, Life = 8, Energy = 4 } });
        _campaignNpcRepository.Setup(r => r.ListByCampaignAsync(It.IsAny<long>())).ReturnsAsync(new List<CampaignNpc>());

        _tokenRepository.Setup(r => r.GetByIdAsync(It.IsAny<long>())).ReturnsAsync((long id) => new Token { TokenId = id, UserId = 9, Name = "T" });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token>());
        _tokenWeaponRepository.Setup(r => r.ListByTokenIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<TokenWeapon>());
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string>())).Returns((string? name) => name == null ? null : "https://x/" + name);

        _service = new MapTokenService(_repository.Object, _mapRepository.Object, _mapModelRepository.Object, _tokenRepository.Object,
            _campaignCharacterRepository.Object, _characterRepository.Object, _mapNpcRepository.Object, _npcRepository.Object, _turnRepository.Object, _campaignRepository.Object,
            _unitOfWork.Object, _imageStorage.Object, _campaignNpcRepository.Object, _tokenWeaponRepository.Object, _weaponRepository.Object, _notifier.Object);
    }

    private Task<MapTokenMapResultInfo> Change(long pieceId, long mapId, long userId = MASTER) =>
        _service.ChangeMapAsync(userId, pieceId, new MapTokenMapInfo { MapId = mapId });

    private void NothingSaved()
    {
        _repository.Verify(r => r.UpdateAsync(It.IsAny<MapToken>()), Times.Never);
        _mapNpcRepository.Verify(r => r.UpdateAsync(It.IsAny<MapNpc>()), Times.Never);
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    // --- common rules ---

    [Fact]
    public async Task NotTheMaster_IsForbidden()
    {
        await FluentActions.Invoking(() => Change(CHARACTER_PIECE, MAP_B, PLAYER)).Should().ThrowAsync<UnauthorizedAccessException>();
        NothingSaved();
    }

    [Theory]
    [InlineData(CampaignStatus.Paused)]
    [InlineData(CampaignStatus.Finished)]
    public async Task FrozenCampaign_IsRefused(CampaignStatus status)
    {
        _campaign.Status = status;

        await FluentActions.Invoking(() => Change(CHARACTER_PIECE, MAP_B)).Should().ThrowAsync<ConflictException>();
        NothingSaved();
    }

    [Fact]
    public async Task PreparingCampaign_IsAllowedForTheMaster()
    {
        _campaign.Status = CampaignStatus.Preparing;

        var result = await Change(CHARACTER_PIECE, MAP_B);

        result.MapToken.MapId.Should().Be(MAP_B);
    }

    [Fact]
    public async Task ObjectPiece_IsInvalid()
    {
        (await FluentActions.Invoking(() => Change(OBJECT_PIECE, MAP_B)).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("mapTokenId");
        NothingSaved();
    }

    [Theory]
    [InlineData(OTHER_CAMPAIGN_MAP)]
    [InlineData(999)]
    public async Task TargetOutsideTheCampaign_IsNotFound(long mapId)
    {
        await FluentActions.Invoking(() => Change(CHARACTER_PIECE, mapId)).Should().ThrowAsync<KeyNotFoundException>();
        NothingSaved();
    }

    [Fact]
    public async Task SameMap_IsAConflict()
    {
        (await FluentActions.Invoking(() => Change(CHARACTER_PIECE, MAP_A)).Should().ThrowAsync<ConflictException>())
            .WithMessage("A peça já está neste mapa.");
    }

    [Fact]
    public async Task ArchivedTarget_IsAConflict()
    {
        (await FluentActions.Invoking(() => Change(CHARACTER_PIECE, ARCHIVED)).Should().ThrowAsync<ConflictException>())
            .WithMessage("Este mapa está arquivado.");
        NothingSaved();
    }

    // --- US1: characters ---

    [Fact]
    public async Task Character_GoesToTheSameHexAndFacing()
    {
        var result = await Change(CHARACTER_PIECE, MAP_B);

        result.FromMapId.Should().Be(MAP_A);
        result.Adjusted.Should().BeFalse();
        result.MapToken.MapTokenId.Should().Be(CHARACTER_PIECE);
        result.MapToken.MapId.Should().Be(MAP_B);
        (result.MapToken.X, result.MapToken.Y, result.MapToken.Look).Should().Be((5, 3, 2));
        _characterPiece.WalkX.Should().BeNull();
        _repository.Verify(r => r.UpdateAsync(_characterPiece), Times.Once);
        _repository.Verify(r => r.InsertAsync(It.IsAny<MapToken>()), Times.Never);
    }

    [Fact]
    public async Task Character_RecordsNothingInTheTurn()
    {
        await Change(CHARACTER_PIECE, MAP_B);

        _turnRepository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Character_PublishesBothMapsAndTheCharacterMap()
    {
        await Change(CHARACTER_PIECE, MAP_B);

        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKEN_DELETED && e.MapId == MAP_A)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKEN_UPSERTED && e.MapId == MAP_B)), Times.Once);
        _notifier.Verify(n => n.PublishSplitAsync(
            It.Is<TableEventInfo>(e => e.Type == TableEventType.CHARACTER_MAP && e.MapId == MAP_B
                && ((CharacterMapEventInfo)e.Data!).CampaignCharacterId == PARTICIPATION),
            It.Is<IReadOnlyCollection<long>>(ids => ids.Contains(MASTER) && ids.Contains(PLAYER)),
            null), Times.Once);
    }

    [Fact]
    public async Task Character_NotApproved_IsAConflict()
    {
        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(PARTICIPATION)).ReturnsAsync(new CampaignCharacter
        {
            CampaignCharacterId = PARTICIPATION, CampaignId = CAMPAIGN, CharacterId = CHARACTER, Status = CampaignCharacterStatus.RequestedAccess
        });

        await FluentActions.Invoking(() => Change(CHARACTER_PIECE, MAP_B)).Should().ThrowAsync<ConflictException>();
        NothingSaved();
    }

    // --- US2: NPCs ---

    [Fact]
    public async Task Npc_TheSameInstanceAndPieceMoveKeepingEverything()
    {
        var result = await Change(NPC_PIECE, MAP_B);

        result.Adjusted.Should().BeFalse();
        (result.MapToken.X, result.MapToken.Y, result.MapToken.Look).Should().Be((2, 4, 1));
        _instance.MapId.Should().Be(MAP_B);
        _npcPiece.MapId.Should().Be(MAP_B);
        _npcPiece.MapNpcId.Should().Be(INSTANCE);
        _instance.Name.Should().Be("Guarda 2");
        (_instance.CurrentLife, _instance.CurrentEnergy, _instance.Status, _instance.Posture, _instance.CurrentMove, _instance.RepeatedAction)
            .Should().Be((3, 1, "ferido", Posture.Down, 4, "ataca"));
        _mapNpcRepository.Verify(r => r.UpdateAsync(_instance), Times.Once);
        _repository.Verify(r => r.UpdateAsync(_npcPiece), Times.Once);
        _unitOfWork.Verify(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>()), Times.Once);
        _turnRepository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Npc_NameTakenOnTheTarget_IsRenumbered()
    {
        _instancesOnB = new List<MapNpc>
        {
            new() { MapNpcId = 91, MapId = MAP_B, NpcId = NPC, Name = "Guarda" },
            new() { MapNpcId = 92, MapId = MAP_B, NpcId = NPC, Name = "Guarda 2" }
        };

        await Change(NPC_PIECE, MAP_B);

        _instance.Name.Should().Be("Guarda 3");
        _npcPiece.Name.Should().Be("Guarda 3");
    }

    [Fact]
    public async Task Npc_SameNameOfAnotherNpc_IsKept()
    {
        _instancesOnB = new List<MapNpc> { new() { MapNpcId = 91, MapId = MAP_B, NpcId = 77, Name = "Guarda 2" } };

        await Change(NPC_PIECE, MAP_B);

        _instance.Name.Should().Be("Guarda 2");
    }

    [Fact]
    public async Task Npc_RemovedInstance_IsNotFound()
    {
        _instance.RemovedAt = DateTime.UtcNow;

        await FluentActions.Invoking(() => Change(NPC_PIECE, MAP_B)).Should().ThrowAsync<KeyNotFoundException>();
        NothingSaved();
    }

    [Fact]
    public async Task Npc_ReloadsThePiecesOfBothMaps()
    {
        await Change(NPC_PIECE, MAP_B);

        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKENS_CHANGED && e.MapId == MAP_A)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKENS_CHANGED && e.MapId == MAP_B)), Times.Once);
    }

    // --- US3: occupied / outside ---

    [Fact]
    public async Task OccupiedHex_GoesToTheNearestFreeOne()
    {
        _piecesOnB = new List<MapToken> { new() { MapTokenId = 60, MapId = MAP_B, TokenId = 5, Name = "Baú", X = 5, Y = 3 } };

        var result = await Change(CHARACTER_PIECE, MAP_B);

        result.Adjusted.Should().BeTrue();
        (result.MapToken.X, result.MapToken.Y).Should().NotBe((5, 3));
        Roll6.Domain.Grid.HexGrid.Distance(5, 3, result.MapToken.X, result.MapToken.Y).Should().Be(1);
        result.MapToken.Look.Should().Be(2);
    }

    [Fact]
    public async Task OutsideASmallerGrid_GoesInside()
    {
        var result = await Change(NPC_PIECE, SMALL);

        result.Adjusted.Should().BeTrue();
        result.MapToken.X.Should().BeInRange(0, 3);
        result.MapToken.Y.Should().BeInRange(0, 3);
    }

    [Fact]
    public async Task FullTarget_IsAConflictAndNothingChanges()
    {
        _mapModelRepository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(new MapModel { MapModelId = 50, GridWidth = 1, GridHeight = 1 });
        _piecesOnB = new List<MapToken> { new() { MapTokenId = 60, MapId = MAP_B, TokenId = 5, Name = "Baú", X = 0, Y = 0 } };

        (await FluentActions.Invoking(() => Change(CHARACTER_PIECE, MAP_B)).Should().ThrowAsync<ConflictException>())
            .WithMessage("Não há um hex livre para a peça neste mapa.");
        NothingSaved();
        _characterPiece.MapId.Should().Be(MAP_A);
    }
}
