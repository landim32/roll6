using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.MapNpc;
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

    private readonly Mock<IMapNpcRepository<MapNpc>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<IMapModelRepository<MapModel>> _mapModelRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<INpcRepository<Npc>> _npcRepository = new();
    private readonly Mock<ICampaignNpcRepository<CampaignNpc>> _campaignNpcRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly List<MapToken> _insertedPieces = new();
    private readonly MapNpcService _service;
    private long _nextId = 90;

    public MapNpcServiceTests()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(MAP)).ReturnsAsync(new Map { MapId = MAP, CampaignId = CAMPAIGN, MapModelId = 50, UserId = MASTER, Status = MapStatus.Active });
        _mapModelRepository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(new MapModel { MapModelId = 50, GridWidth = 10, GridHeight = 8 });
        _npcRepository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(new Npc { NpcId = NPC, UserId = MASTER, TokenId = 5, Name = "Goblin", Life = 7, Energy = 2 });
        _campaignNpcRepository.Setup(r => r.GetAsync(CAMPAIGN, NPC)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC });
        _repository.Setup(r => r.InsertAsync(It.IsAny<MapNpc>())).ReturnsAsync((MapNpc m) => { m.MapNpcId = _nextId++; return m; });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<MapNpc>())).ReturnsAsync((MapNpc m) => m);
        _mapTokenRepository.Setup(r => r.InsertAsync(It.IsAny<MapToken>())).ReturnsAsync((MapToken t) => { _insertedPieces.Add(t); return t; });
        _mapTokenRepository.Setup(r => r.ListByMapNpcIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(() => _insertedPieces.ToList());
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token> { new() { TokenId = 5 } });
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _service = new MapNpcService(_repository.Object, _mapRepository.Object, _mapModelRepository.Object, _mapTokenRepository.Object,
            _npcRepository.Object, _campaignNpcRepository.Object, _campaignCharacterRepository.Object, _tokenRepository.Object,
            _unitOfWork.Object, Mock.Of<IImageStorageAppService>());
    }

    private static MapNpcInsertInfo At(int x, int y) => new() { MapId = MAP, NpcId = NPC, X = x, Y = y };

    [Fact]
    public async Task Create_Master_CreatesTheOccurrenceAndItsNpcPiece()
    {
        var result = await _service.CreateAsync(MASTER, At(2, 3));

        (result.Name, result.Life, result.Energy, result.Status, result.X, result.Y, result.TokenId)
            .Should().Be(("Goblin", 7, 2, (string?)null, (int?)2, (int?)3, (long?)5));
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
        _mapTokenRepository.Setup(r => r.ExistsAtAsync(MAP, 1, 1, null)).ReturnsAsync(true);

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
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin", Life = 7 });

        var result = await _service.UpdateAsync(MASTER, 90, new MapNpcUpdateInfo { Name = "Goblin 2", Life = -1, Energy = 0, Status = "caído" });

        (result.Name, result.Life, result.Status).Should().Be(("Goblin 2", -1, "caído"));
        _npcRepository.Verify(r => r.UpdateAsync(It.IsAny<Npc>()), Times.Never);
    }

    [Fact]
    public async Task Update_NotMaster_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new MapNpc { MapNpcId = 90, MapId = MAP, NpcId = NPC, Name = "Goblin" });

        await _service.Invoking(s => s.UpdateAsync(PLAYER, 90, new MapNpcUpdateInfo { Name = "X" })).Should().ThrowAsync<UnauthorizedAccessException>();
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
}
