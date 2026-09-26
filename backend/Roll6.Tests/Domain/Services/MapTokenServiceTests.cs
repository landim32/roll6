using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.MapToken;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class MapTokenServiceTests
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
    private readonly MapTokenService _service;

    private const long APPROVED = 70;
    private const long ARIA = 80;
    private const long BRAM = 81;

    public MapTokenServiceTests()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(30)).ReturnsAsync(new Map { MapId = 30, CampaignId = 10, MapModelId = 50, UserId = 1, Status = MapStatus.Active });
        _mapModelRepository.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(new MapModel { MapModelId = 50, GridWidth = 10, GridHeight = 8 });
        _tokenRepository.Setup(r => r.GetByIdAsync(6)).ReturnsAsync(new Token { TokenId = 6, UserId = 9, Name = "Guerreira" });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token>());
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _campaignRepository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Campaign { CampaignId = 10, UserId = 1, Name = "C", CurrentTurn = 3 });
        _characterRepository.Setup(r => r.UpdateAsync(It.IsAny<Character>())).ReturnsAsync((Character c) => c);
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>());
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter>());
        _tokenRepository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, UserId = 9, Name = "Goblin" });
        _repository.Setup(r => r.InsertAsync(It.IsAny<MapToken>())).ReturnsAsync((MapToken t) => t);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<MapToken>())).ReturnsAsync((MapToken t) => t);
        _service = new MapTokenService(_repository.Object, _mapRepository.Object, _mapModelRepository.Object, _tokenRepository.Object,
            _campaignCharacterRepository.Object, _characterRepository.Object, _mapNpcRepository.Object, _npcRepository.Object, _turnRepository.Object, _campaignRepository.Object,
            _unitOfWork.Object, Mock.Of<IImageStorageAppService>());
    }

    [Fact]
    public async Task Create_WithoutName_CopiesTokenName()
    {
        var result = await _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = (int)MapTokenType.Object });

        result.Name.Should().Be("Goblin");
        result.TokenType.Should().Be((int)MapTokenType.Object);
        result.X.Should().Be(0);
        result.Y.Should().Be(0);
    }

    [Fact]
    public async Task Create_OnMapOfAnotherUser_Throws()
    {
        var act = () => _service.CreateAsync(2, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 2 });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Create_WithInvalidType_Throws()
    {
        var act = () => _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 9 });

        await act.Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Update_MovesTokenToNewHex()
    {
        _repository.Setup(r => r.GetByIdAsync(40)).ReturnsAsync(new MapToken { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Goblin" });

        var result = await _service.UpdateAsync(1, 40, new MapTokenUpdateInfo
        {
            Name = "Goblin", TokenType = (int)MapTokenType.Object, Life = 3, X = 2, Y = 0
        });

        result.X.Should().Be(2);
        result.Y.Should().Be(0);
        result.Life.Should().Be(3);
    }

    [Fact]
    public async Task Create_WithoutLook_FacesTop()
    {
        var result = await _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 4 });

        result.Look.Should().Be(0);
    }

    [Fact]
    public async Task Update_KeepsInformedLook()
    {
        _repository.Setup(r => r.GetByIdAsync(40)).ReturnsAsync(new MapToken { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Goblin" });

        var result = await _service.UpdateAsync(1, 40, new MapTokenUpdateInfo { Name = "Goblin", TokenType = 4, Look = 5 });

        result.Look.Should().Be(5);
    }

    [Theory]
    [InlineData(6)]
    [InlineData(-1)]
    public async Task Create_WithLookOutOfRange_Throws(int look)
    {
        var act = () => _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 4, Look = look });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("look");
        _repository.Verify(r => r.InsertAsync(It.IsAny<MapToken>()), Times.Never);
    }

    [Fact]
    public async Task Delete_OnDeletedMap_ThrowsNotFound()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(31)).ReturnsAsync(new Map { MapId = 31, UserId = 1, Status = MapStatus.Deleted });
        _repository.Setup(r => r.GetByIdAsync(41)).ReturnsAsync(new MapToken { MapTokenId = 41, MapId = 31 });

        var act = () => _service.DeleteAsync(1, 41);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ListByMap_ByApprovedParticipant_ReturnsTokens()
    {
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(10, 2)).ReturnsAsync(true);
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Goblin" } });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token>());

        var result = await _service.ListByMapAsync(2, 30);

        result.Should().ContainSingle(t => t.MapTokenId == 40);
    }

    [Fact]
    public async Task ListByMap_WithoutApprovedCharacter_Throws()
    {
        var act = () => _service.ListByMapAsync(2, 30);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Update_ByApprovedParticipant_Throws()
    {
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(10, 2)).ReturnsAsync(true);
        _repository.Setup(r => r.GetByIdAsync(40)).ReturnsAsync(new MapToken { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Goblin" });

        var act = () => _service.UpdateAsync(2, 40, new MapTokenUpdateInfo { Name = "Goblin", TokenType = 4 });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    private void SetupParticipation(long id, long campaignId, CampaignCharacterStatus status, long characterId, long? tokenId)
    {
        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(new CampaignCharacter
        {
            CampaignCharacterId = id, CampaignId = campaignId, CharacterId = characterId, Status = status,
            CurrentLife = 8, CurrentEnergy = 3, CharacterStatus = "ferida"
        });
        _characterRepository.Setup(r => r.GetByIdAsync(characterId)).ReturnsAsync(() => new Character
        {
            CharacterId = characterId, UserId = 2, Name = characterId == ARIA ? "Aria" : "Bram", Move = 5, TokenId = tokenId
        });
    }

    private static MapTokenCharacterInsertInfo Place(long? tokenId = null, int x = 3, int y = 2) =>
        new() { MapId = 30, CampaignCharacterId = APPROVED, TokenId = tokenId, X = x, Y = y };

    [Fact]
    public async Task PlaceCharacter_WithItsToken_KeepsTheCharacter()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 6);

        var result = await _service.PlaceCharacterAsync(1, Place(tokenId: 5));

        result.TokenType.Should().Be((int)MapTokenType.Character);
        result.TokenId.Should().Be(6);
        result.CampaignCharacterId.Should().Be(APPROVED);
        (result.X, result.Y).Should().Be((3, 2));
        _characterRepository.Verify(r => r.UpdateAsync(It.IsAny<Character>()), Times.Never);
    }

    [Fact]
    public async Task PlaceCharacter_WithoutToken_SavesTheChosenOneOnTheCharacter()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, BRAM, tokenId: null);

        var result = await _service.PlaceCharacterAsync(1, Place(tokenId: 5));

        result.TokenId.Should().Be(5);
        _characterRepository.Verify(r => r.UpdateAsync(It.Is<Character>(c => c.CharacterId == BRAM && c.TokenId == 5)), Times.Once);
    }

    [Fact]
    public async Task PlaceCharacter_WithoutAnyToken_Throws()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, BRAM, tokenId: null);

        var act = () => _service.PlaceCharacterAsync(1, Place());

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("tokenId");
    }

    [Fact]
    public async Task PlaceCharacter_NotMaster_Throws()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 6);

        var act = () => _service.PlaceCharacterAsync(2, Place());

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Theory]
    [InlineData(11, CampaignCharacterStatus.Approved)]
    [InlineData(10, CampaignCharacterStatus.RequestedAccess)]
    public async Task PlaceCharacter_OtherCampaignOrNotApproved_Throws(long campaignId, CampaignCharacterStatus status)
    {
        SetupParticipation(APPROVED, campaignId, status, ARIA, tokenId: 6);

        var act = () => _service.PlaceCharacterAsync(1, Place());

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task PlaceCharacter_AlreadyOnTheMap_Throws()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 6);
        _repository.Setup(r => r.GetByMapAndCampaignCharacterAsync(30, APPROVED)).ReturnsAsync(new MapToken { MapTokenId = 45 });

        var act = () => _service.PlaceCharacterAsync(1, Place());

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*já está neste mapa*");
    }

    [Fact]
    public async Task PlaceCharacter_OnOccupiedHex_Throws()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 6);
        _repository.Setup(r => r.ExistsAtAsync(30, 3, 2, null)).ReturnsAsync(true);

        var act = () => _service.PlaceCharacterAsync(1, Place());

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*ocupado*");
    }

    [Fact]
    public async Task PlaceCharacter_OutsideTheGrid_Throws()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 6);

        var act = () => _service.PlaceCharacterAsync(1, Place(x: 10, y: 0));

        await act.Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Move_ToOccupiedHex_Throws_AndToFreeHex_Moves()
    {
        _repository.Setup(r => r.GetByIdAsync(40)).ReturnsAsync(new MapToken { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Goblin", TokenType = MapTokenType.Object });
        _repository.Setup(r => r.ExistsAtAsync(30, 1, 1, 40)).ReturnsAsync(true);

        var blocked = () => _service.MoveAsync(1, 40, new MapTokenPositionInfo { X = 1, Y = 1 });
        await blocked.Should().ThrowAsync<ConflictException>();

        var moved = await _service.MoveAsync(1, 40, new MapTokenPositionInfo { X = 4, Y = 5 });
        (moved.X, moved.Y).Should().Be((4, 5));
    }

    [Fact]
    public async Task ChangeToken_KeepsPositionAndLink()
    {
        _repository.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(MapToken.PlaceCharacter(30, 5, APPROVED, "Aria", 3, 2));
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 5);

        var result = await _service.ChangeTokenAsync(1, 42, new MapTokenTokenInfo { TokenId = 6 });

        result.TokenId.Should().Be(6);
        (result.X, result.Y).Should().Be((3, 2));
        result.CampaignCharacterId.Should().Be(APPROVED);
    }

    [Fact]
    public async Task ChangeToken_NotMaster_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(40)).ReturnsAsync(new MapToken { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Goblin" });

        var act = () => _service.ChangeTokenAsync(2, 40, new MapTokenTokenInfo { TokenId = 6 });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Create_OnOccupiedHex_Throws()
    {
        _repository.Setup(r => r.ExistsAtAsync(30, 0, 0, null)).ReturnsAsync(true);

        var act = () => _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 4 });

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task Create_NpcType_Throws()
    {
        var act = () => _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 2 });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("tokenType");
    }

    [Fact]
    public async Task Create_CharacterType_Throws()
    {
        var act = () => _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 1 });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("tokenType");
    }

    [Fact]
    public async Task ListByMap_CharacterToken_ShowsTheParticipation()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 5);
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = APPROVED, CampaignId = 10, CharacterId = ARIA, CurrentLife = 8, CurrentEnergy = 3, CharacterStatus = "ferida", Sheet = "Força 3" }
        });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>
        {
            new() { CharacterId = ARIA, Name = "Aria", Move = 5 }
        });
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken>
        {
            MapToken.PlaceCharacter(30, 5, APPROVED, "Nome antigo", 3, 2),
            new() { MapTokenId = 41, MapId = 30, TokenId = 5, Name = "Goblin", TokenType = MapTokenType.Object, Life = 4 }
        });

        var result = await _service.ListByMapAsync(1, 30);

        var aria = result.Single(t => t.CampaignCharacterId == APPROVED);
        (aria.Name, aria.Life, aria.Energy, aria.Status, aria.Sheet, aria.Move, aria.CharacterId)
            .Should().Be(("Aria", 8, 3, "ferida", "Força 3", 5, (long?)ARIA));
        var goblin = result.Single(t => t.MapTokenId == 41);
        (goblin.Name, goblin.Life, goblin.CharacterId).Should().Be(("Goblin", 4, (long?)null));
    }

    [Fact]
    public async Task ListByMap_NpcPiece_ShowsTheOccurrence()
    {
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<MapNpc>
        {
            new() { MapNpcId = 90, MapId = 30, NpcId = 8, Name = "Goblin 2", Life = -1, Energy = 2, Status = "caído" }
        });
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Npc>
        {
            new() { NpcId = 8, Name = "Goblin", Move = 6 }
        });
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken>
        {
            MapToken.PlaceNpc(30, 5, 90, "Goblin", 1, 1, 0)
        });

        var piece = (await _service.ListByMapAsync(1, 30)).Single();

        (piece.MapNpcId, piece.NpcId, piece.Name, piece.Life, piece.Energy, piece.Status, piece.Move)
            .Should().Be(((long?)90, (long?)8, "Goblin 2", -1, 2, "caído", 6));
        piece.TokenType.Should().Be((int)MapTokenType.Npc);
    }

    [Fact]
    public async Task Delete_NpcPiece_DeletesTheOccurrenceToo()
    {
        var piece = MapToken.PlaceNpc(30, 5, 90, "Goblin", 1, 1, 0);
        piece.MapTokenId = 44;
        _repository.Setup(r => r.GetByIdAsync(44)).ReturnsAsync(piece);

        await _service.DeleteAsync(1, 44);

        _repository.Verify(r => r.DeleteAsync(44), Times.Once);
        _mapNpcRepository.Verify(r => r.DeleteAsync(90), Times.Once);
    }

    private MapToken AriaPiece()
    {
        var piece = MapToken.PlaceCharacter(30, 5, APPROVED, "Aria", 2, 2);
        piece.MapTokenId = 42;
        _repository.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(piece);
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { piece });
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 5);
        return piece;
    }

    [Fact]
    public async Task Move_SavesTheFacing_AndRejectsInvalidOnes()
    {
        AriaPiece();

        var moved = await _service.MoveAsync(1, 42, new MapTokenPositionInfo { X = 2, Y = 1, Look = 3 });
        (moved.X, moved.Y, moved.Look).Should().Be((2, 1, 3));

        (await _service.Invoking(s => s.MoveAsync(1, 42, new MapTokenPositionInfo { X = 2, Y = 1, Look = 6 }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("look");
    }

    [Fact]
    public async Task Move_PlayerOwnCharacter_WithinItsMove()
    {
        AriaPiece();

        // 2 steps ahead (cost 2 <= move 5).
        var moved = await _service.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 0, Look = 0 });

        (moved.X, moved.Y).Should().Be((2, 0));
    }

    [Fact]
    public async Task Move_RecordsTheMovementOfTheCurrentTurn()
    {
        AriaPiece();
        Turn? recorded = null;
        _turnRepository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => recorded = t).ReturnsAsync((Turn t) => t);

        await _service.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 0, Look = 0 });

        recorded.Should().NotBeNull();
        (recorded!.TurnType, recorded.TurnNo, recorded.CharacterId, recorded.MapId).Should().Be((TurnType.Movement, 3, (long?)ARIA, (long?)30));
        (recorded.BeforeX, recorded.BeforeY, recorded.X, recorded.Y).Should().Be(((int?)2, (int?)2, (int?)2, (int?)0));
    }

    [Fact]
    public async Task Move_TwiceInTheSameTurn_Throws()
    {
        AriaPiece();
        _turnRepository.Setup(r => r.ExistsMovementAsync(10, 3, ARIA, null)).ReturnsAsync(true);

        await _service.Invoking(s => s.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 0, Look = 0 })).Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<MapToken>()), Times.Never);
        _turnRepository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Move_PlayerBeyondItsMove_Throws()
    {
        AriaPiece();

        // Turning around and walking 3 hexes down costs 6 > move 5.
        (await _service.Invoking(s => s.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 5, Look = 3 }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("move");
        _repository.Verify(r => r.UpdateAsync(It.IsAny<MapToken>()), Times.Never);
    }

    [Fact]
    public async Task Move_MasterBeyondTheMove_IsAllowed()
    {
        AriaPiece();

        var moved = await _service.MoveAsync(1, 42, new MapTokenPositionInfo { X = 2, Y = 7, Look = 3 });

        (moved.X, moved.Y).Should().Be((2, 7));
    }

    [Fact]
    public async Task Move_PlayerOtherPieces_Throws()
    {
        AriaPiece();
        _repository.Setup(r => r.GetByIdAsync(40)).ReturnsAsync(new MapToken { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Bau", TokenType = MapTokenType.Object });

        await _service.Invoking(s => s.MoveAsync(3, 42, new MapTokenPositionInfo { X = 2, Y = 1 })).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.MoveAsync(2, 40, new MapTokenPositionInfo { X = 1, Y = 1 })).Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
