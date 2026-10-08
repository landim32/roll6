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
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
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
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string>())).Returns((string? name) => name == null ? null : "https://x/" + name);
        _service = new MapTokenService(_repository.Object, _mapRepository.Object, _mapModelRepository.Object, _tokenRepository.Object,
            _campaignCharacterRepository.Object, _characterRepository.Object, _mapNpcRepository.Object, _npcRepository.Object, _turnRepository.Object, _campaignRepository.Object,
            _unitOfWork.Object, _imageStorage.Object, _notifier.Object);
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

    /// <summary>The character's move is always 5; <paramref name="currentMove"/> is its Deslocamento in the campaign (037).</summary>
    private void SetupParticipation(long id, long campaignId, CampaignCharacterStatus status, long characterId, long? tokenId, int currentMove = 5)
    {
        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(new CampaignCharacter
        {
            CampaignCharacterId = id, CampaignId = campaignId, CharacterId = characterId, Status = status,
            CurrentLife = 8, CurrentEnergy = 3, CurrentMove = currentMove, CharacterStatus = "ferida"
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
    public async Task PlaceCharacter_ByTheCharactersOwner_Places()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 6);

        var result = await _service.PlaceCharacterAsync(2, Place());

        result.CampaignCharacterId.Should().Be(APPROVED);
        (result.X, result.Y).Should().Be((3, 2));
    }

    [Fact]
    public async Task PlaceCharacter_NeitherMasterNorOwner_Throws()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 6);

        var act = () => _service.PlaceCharacterAsync(3, Place());

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<MapToken>()), Times.Never);
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
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 99, MapId = 30, TokenId = 5, X = 3, Y = 2 } });

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
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 99, MapId = 30, TokenId = 5, X = 1, Y = 1 } });

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
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 99, MapId = 30, TokenId = 5, X = 0, Y = 0 } });

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
            new() { CampaignCharacterId = APPROVED, CampaignId = 10, CharacterId = ARIA, CurrentLife = 8, CurrentEnergy = 3, CurrentMove = 5, CharacterStatus = "ferida", Sheet = "Força 3" }
        });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>
        {
            new() { CharacterId = ARIA, Name = "Aria", Move = 5, Life = 12, Energy = 6 }
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
        // 026: character pieces keep reading the participation, with the character's totals.
        // 032: the participation's Sheet is now this campaign's copy of the character's sheet, so a piece shows the
        // campaign sheet — here the character has none of its own, which is exactly the point.
        (aria.TotalLife, aria.TotalEnergy).Should().Be((12, 6));
        var goblin = result.Single(t => t.MapTokenId == 41);
        (goblin.Name, goblin.Life, goblin.CharacterId).Should().Be(("Goblin", 4, (long?)null));
    }

    [Fact]
    public async Task ListByMap_NpcPiece_ShowsTheOccurrence()
    {
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<MapNpc>
        {
            new() { MapNpcId = 90, MapId = 30, NpcId = 8, Name = "Goblin 2", CurrentLife = -1, CurrentEnergy = 2, Status = "caído" }
        });
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Npc>
        {
            new() { NpcId = 8, Name = "Goblin", Move = 6, Life = 11, Energy = 9, Sheet = "## Goblin" }
        });
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken>
        {
            MapToken.PlaceNpc(30, 5, 90, "Goblin", 1, 1, 0)
        });

        var piece = (await _service.ListByMapAsync(1, 30)).Single();

        (piece.MapNpcId, piece.NpcId, piece.Name, piece.Life, piece.Energy, piece.Status, piece.Move)
            .Should().Be(((long?)90, (long?)8, "Goblin 2", -1, 2, "caído", 6));
        (piece.TotalLife, piece.TotalEnergy, piece.Sheet).Should().Be((11, 9, "## Goblin"));
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
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e =>
            e.Type == TableEventType.MAP_TOKEN_DELETED && e.CampaignId == 10 && e.MapId == 30)), Times.Once);
    }

    private MapToken AriaPiece(int currentMove = 5)
    {
        var piece = MapToken.PlaceCharacter(30, 5, APPROVED, "Aria", 2, 2);
        piece.MapTokenId = 42;
        _repository.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(piece);
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { piece });
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 5, currentMove);
        return piece;
    }

    // ---- 037: the Deslocamento of the campaign limits the player, not the character's move ----

    [Fact]
    public async Task Move_PlayerIsLimitedByTheCampaignDeslocamento()
    {
        AriaPiece(currentMove: 1);

        // 2 steps ahead costs 2: within the character's move (5) but beyond the Deslocamento (1).
        (await _service.Invoking(s => s.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 0, Look = 0 }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("move");
        _repository.Verify(r => r.UpdateAsync(It.IsAny<MapToken>()), Times.Never);

        var moved = await _service.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 1, Look = 0 });
        (moved.X, moved.Y).Should().Be((2, 1));
    }

    [Fact]
    public async Task Move_PlayerMayGoBeyondTheCharactersMove_WhenTheDeslocamentoAllows()
    {
        AriaPiece(currentMove: 6);

        // Turning around (3) and walking 3 hexes down (3) costs 6 > move 5, = Deslocamento 6.
        var moved = await _service.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 5, Look = 3 });

        (moved.X, moved.Y).Should().Be((2, 5));
    }

    [Fact]
    public async Task Move_ZeroDeslocamento_RefusesAnyStep()
    {
        AriaPiece(currentMove: 0);

        (await _service.Invoking(s => s.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 1, Look = 0 }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("move");
    }

    [Fact]
    public async Task Move_MasterIgnoresTheDeslocamento()
    {
        AriaPiece(currentMove: 0);

        var moved = await _service.MoveAsync(1, 42, new MapTokenPositionInfo { X = 2, Y = 0, Look = 0 });

        (moved.X, moved.Y).Should().Be((2, 0));
    }

    [Fact]
    public async Task ListByMap_CharacterPiece_MoveIsTheCampaignDeslocamento()
    {
        SetupParticipation(APPROVED, 10, CampaignCharacterStatus.Approved, ARIA, tokenId: 5);
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = APPROVED, CampaignId = 10, CharacterId = ARIA, CurrentLife = 8, CurrentEnergy = 3, CurrentMove = 1 }
        });
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character>
        {
            new() { CharacterId = ARIA, Name = "Aria", Move = 5, Life = 12, Energy = 6 }
        });
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { MapToken.PlaceCharacter(30, 5, APPROVED, "Aria", 3, 2) });

        var result = await _service.ListByMapAsync(1, 30);

        result.Single().Move.Should().Be(1, "the Mover mode uses this as the player's limit (037)");
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
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKEN_UPSERTED
            && e.CampaignId == 10 && e.MapId == 30 && e.ActorUserId == 2 && ((MapTokenInfo)e.Data!).X == 2)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.TURN_CHANGED && e.CampaignId == 10)), Times.Once);
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
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
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

    // ---- 024: author and movement points ----

    [Fact]
    public async Task Move_Player_RecordsTheAuthorAndThePointsSpent()
    {
        AriaPiece();
        Turn? recorded = null;
        _turnRepository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => recorded = t).ReturnsAsync((Turn t) => t);

        await _service.MoveAsync(2, 42, new MapTokenPositionInfo { X = 2, Y = 0, Look = 0 });

        (recorded!.UserId, recorded.Moved).Should().Be((2L, (int?)2));
    }

    [Fact]
    public async Task Move_Master_RecordsThePointsSpentEvenBeyondTheMove()
    {
        AriaPiece();
        Turn? recorded = null;
        _turnRepository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => recorded = t).ReturnsAsync((Turn t) => t);

        // From (2, 2) facing north: turn around (3) + 5 steps down = 8.
        await _service.MoveAsync(1, 42, new MapTokenPositionInfo { X = 2, Y = 7, Look = 3 });

        (recorded!.UserId, recorded.Moved).Should().Be((1L, (int?)8));
    }

    // ---- 026: NPC pieces read the occurrence (never the piece's own zeros) ----

    private void NpcPiece(MapNpc occurrence, Npc npc, string? pieceSheet = null)
    {
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<MapNpc> { occurrence });
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Npc> { npc });
        var piece = MapToken.PlaceNpc(30, 5, occurrence.MapNpcId, occurrence.Name, 3, 3, 0);
        piece.Sheet = pieceSheet;
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { piece });
    }

    [Fact]
    public async Task ListByMap_JustPlacedNpc_ShowsTheOccurrenceAtTheNpcTotals()
    {
        var npc = new Npc { NpcId = 8, Name = "Batedor", Life = 11, Energy = 11, Move = 5, Sheet = "Ficha do batedor" };
        NpcPiece(WithId(MapNpc.FromNpc(30, npc), 91), npc);

        var piece = (await _service.ListByMapAsync(1, 30)).Single();

        (piece.Life, piece.Energy, piece.TotalLife, piece.TotalEnergy).Should().Be((11, 11, 11, 11));
        piece.Sheet.Should().Be("Ficha do batedor");
    }

    [Fact]
    public async Task ListByMap_UpdatedOccurrence_ShowsTheNewValuesAndStatus()
    {
        var npc = new Npc { NpcId = 8, Name = "Batedor", Life = 11, Energy = 11 };
        var occurrence = WithId(MapNpc.FromNpc(30, npc), 92);
        occurrence.Update("Batedor", 1, 11, "Montado, cavalo exausto", 11, 11);
        NpcPiece(occurrence, npc);

        var piece = (await _service.ListByMapAsync(1, 30)).Single();

        (piece.Life, piece.TotalLife, piece.Status).Should().Be((1, 11, "Montado, cavalo exausto"));
    }

    [Fact]
    public async Task ListByMap_NpcPieceWithItsOwnSheet_KeepsIt()
    {
        var npc = new Npc { NpcId = 8, Name = "Batedor", Life = 11, Energy = 11, Sheet = "Ficha do NPC" };
        NpcPiece(WithId(MapNpc.FromNpc(30, npc), 93), npc, pieceSheet: "Anotação da peça");

        (await _service.ListByMapAsync(1, 30)).Single().Sheet.Should().Be("Anotação da peça");
    }

    [Fact]
    public async Task ListByMap_ObjectPiece_TotalsAreItsOwnValues()
    {
        var chest = MapToken.PlaceNpc(30, 5, 99, "Baú", 4, 4, 0);
        chest.MapNpcId = null;
        chest.Update("Baú", (int)MapTokenType.Object, null, 3, 1, null, 0, 4, 4, 0);
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { chest });

        var piece = (await _service.ListByMapAsync(1, 30)).Single();

        (piece.Life, piece.TotalLife, piece.Energy, piece.TotalEnergy).Should().Be((3, 3, 1, 1));
    }

    private static MapNpc WithId(MapNpc occurrence, long id)
    {
        occurrence.MapNpcId = id;
        return occurrence;
    }

    // ---- 031: posture from the piece menu ----

    private const long POSTURE_PARTICIPATION = 75;

    private void SetupCharacterPiece(long ownerId, CampaignCharacterStatus status = CampaignCharacterStatus.Approved)
    {
        _repository.Setup(r => r.GetByIdAsync(60)).ReturnsAsync(new MapToken
        {
            MapTokenId = 60, MapId = 30, TokenId = 6, CampaignCharacterId = POSTURE_PARTICIPATION, TokenType = MapTokenType.Character, Name = "Aria"
        });
        var participation = new CampaignCharacter { CampaignCharacterId = POSTURE_PARTICIPATION, CampaignId = 10, CharacterId = 90, Status = status };
        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(POSTURE_PARTICIPATION)).ReturnsAsync(participation);
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter> { participation });
        _characterRepository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new Character { CharacterId = 90, UserId = ownerId, Name = "Aria" });
    }

    [Theory]
    [InlineData(2L)]
    [InlineData(1L)]
    public async Task SetPosture_OwnerOrMaster_SavesOnTheParticipationAndRecordsIt(long userId)
    {
        SetupCharacterPiece(ownerId: 2);
        Turn? recorded = null;
        _turnRepository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => recorded = t).ReturnsAsync((Turn t) => t);

        var result = await _service.SetPostureAsync(userId, 60, new MapTokenPostureInfo { Posture = 3 });

        result.Posture.Should().Be(3);
        _campaignCharacterRepository.Verify(r => r.UpdateAsync(It.Is<CampaignCharacter>(p => p.Posture == Posture.OutOfCombat)), Times.Once);
        (recorded!.TurnType, recorded.CharacterId, recorded.UserId, recorded.TurnNo).Should().Be((TurnType.CharacterUpdate, (long?)90, userId, 3));
        recorded.Changes!.Should().ContainSingle(c => c.Field == "posture" && c.Before == "1" && c.After == "3");
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.PARTY_CHANGED)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKENS_CHANGED && e.MapId == null)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.TURN_CHANGED)), Times.Once);
        _repository.Verify(r => r.ListByMapAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task SetPosture_OtherPlayer_Throws()
    {
        SetupCharacterPiece(ownerId: 2);

        await _service.Invoking(s => s.SetPostureAsync(3, 60, new MapTokenPostureInfo { Posture = 2 })).Should().ThrowAsync<UnauthorizedAccessException>();
        _campaignCharacterRepository.Verify(r => r.UpdateAsync(It.IsAny<CampaignCharacter>()), Times.Never);
    }

    [Fact]
    public async Task SetPosture_NotApproved_Throws()
    {
        SetupCharacterPiece(ownerId: 2, CampaignCharacterStatus.Denied);

        await _service.Invoking(s => s.SetPostureAsync(2, 60, new MapTokenPostureInfo { Posture = 2 })).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task SetPosture_SamePosture_RecordsNothing()
    {
        SetupCharacterPiece(ownerId: 2);

        var result = await _service.SetPostureAsync(2, 60, new MapTokenPostureInfo { Posture = 1 });

        result.Posture.Should().Be(1);
        _turnRepository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task SetPosture_Npc_OnlyTheMaster()
    {
        _repository.Setup(r => r.GetByIdAsync(61)).ReturnsAsync(new MapToken { MapTokenId = 61, MapId = 30, TokenId = 5, MapNpcId = 91, TokenType = MapTokenType.Npc, Name = "Goblin" });
        var occurrence = new MapNpc { MapNpcId = 91, MapId = 30, NpcId = 8, Name = "Goblin" };
        _mapNpcRepository.Setup(r => r.GetByIdAsync(91)).ReturnsAsync(occurrence);
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<MapNpc> { occurrence });
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Npc>());

        await _service.Invoking(s => s.SetPostureAsync(2, 61, new MapTokenPostureInfo { Posture = 2 })).Should().ThrowAsync<UnauthorizedAccessException>();

        var result = await _service.SetPostureAsync(1, 61, new MapTokenPostureInfo { Posture = 2 });

        result.Posture.Should().Be(2);
        _mapNpcRepository.Verify(r => r.UpdateAsync(It.Is<MapNpc>(m => m.Posture == Posture.Down)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKEN_UPSERTED && e.MapId == 30)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.TURN_CHANGED)), Times.Once);
    }

    [Fact]
    public async Task SetPosture_Object_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(62)).ReturnsAsync(new MapToken { MapTokenId = 62, MapId = 30, TokenId = 5, TokenType = MapTokenType.Object, Name = "Baú" });

        (await _service.Invoking(s => s.SetPostureAsync(1, 62, new MapTokenPostureInfo { Posture = 2 })).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("posture");
    }

    // ---- 031: pieces of several hexes ----

    [Fact]
    public async Task Create_BigToken_NeedsTheWholeShapeFree()
    {
        _tokenRepository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Token { TokenId = 7, UserId = 9, Name = "Cavalo", UpSpace = 2 });
        // Facing up at (3, 2), a 2-hex piece also takes the hex behind it: (3, 3).
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 99, MapId = 30, TokenId = 5, X = 3, Y = 3 } });

        var act = () => _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 7, TokenType = 4, X = 3, Y = 2, Look = 0 });

        await act.Should().ThrowAsync<ConflictException>();
        var turned = await _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 7, TokenType = 4, X = 3, Y = 2, Look = 3 });
        (turned.X, turned.Y, turned.Look).Should().Be((3, 2, 3));
    }

    [Fact]
    public async Task Create_BigTokenLeavingTheGrid_Throws()
    {
        _tokenRepository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Token { TokenId = 7, UserId = 9, Name = "Dragão", UpSpace = 7 });

        var act = () => _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 7, TokenType = 4, X = 0, Y = 3 });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("x");
    }

    [Fact]
    public async Task Move_OntoAnyHexOfABigPiece_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(40)).ReturnsAsync(new MapToken { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Goblin", TokenType = MapTokenType.Object });
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken>
        {
            new() { MapTokenId = 40, MapId = 30, TokenId = 5 },
            new() { MapTokenId = 41, MapId = 30, TokenId = 7, X = 5, Y = 4 }
        });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token>
        {
            new() { TokenId = 5, Name = "Goblin" }, new() { TokenId = 7, Name = "Dragão", UpSpace = 7 }
        });

        var act = () => _service.MoveAsync(1, 40, new MapTokenPositionInfo { X = 6, Y = 4 });

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task ListByMap_ReturnsTheSizeOfEachPiece()
    {
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(10, 2)).ReturnsAsync(true);
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 41, MapId = 30, TokenId = 7, Name = "Dragão" } });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token> { new() { TokenId = 7, Name = "Dragão", UpSpace = 10 } });

        var result = await _service.ListByMapAsync(2, 30);

        result.Single().Space.Should().Be(10);
        result.Single().Posture.Should().BeNull();
    }

    private const string UP_IMAGE = "0123456789abcdef0123456789abcdef.png";
    private const string FRONT_IMAGE = "fedcba9876543210fedcba9876543210.png";
    private const string RIGHT_IMAGE = "aaaa1111bbbb2222cccc3333dddd4444.png";
    private const string LEFT_IMAGE = "aaaa5555bbbb6666cccc7777dddd8888.png";
    private const string BACK_IMAGE = "aaaa9999bbbb0000cccc1111dddd2222.png";

    [Fact]
    public async Task ListByMap_ReturnsTheFourSpriteImagesOfTheToken()
    {
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 41, MapId = 30, TokenId = 7, Name = "Guerreira" } });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token>
        {
            new() { TokenId = 7, Name = "Guerreira", UpImage = UP_IMAGE, FrontImage = FRONT_IMAGE, RightImage = RIGHT_IMAGE, LeftImage = LEFT_IMAGE, BackImage = BACK_IMAGE }
        });

        var piece = (await _service.ListByMapAsync(1, 30)).Single();

        piece.UpImageUrl.Should().Be("https://x/" + UP_IMAGE);
        piece.FrontImageUrl.Should().Be("https://x/" + FRONT_IMAGE);
        piece.RightImageUrl.Should().Be("https://x/" + RIGHT_IMAGE);
        piece.LeftImageUrl.Should().Be("https://x/" + LEFT_IMAGE);
        piece.BackImageUrl.Should().Be("https://x/" + BACK_IMAGE);
    }

    [Fact]
    public async Task ListByMap_TokenWithoutSpriteImages_HasNoSpriteUrls()
    {
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken> { new() { MapTokenId = 41, MapId = 30, TokenId = 7, Name = "Guerreira" } });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token> { new() { TokenId = 7, Name = "Guerreira" } });

        var piece = (await _service.ListByMapAsync(1, 30)).Single();

        piece.FrontImageUrl.Should().BeNull();
        piece.RightImageUrl.Should().BeNull();
        piece.LeftImageUrl.Should().BeNull();
        piece.BackImageUrl.Should().BeNull();
    }

    // ---- 031 US3: the posture changes the size ----

    private void SetupKnight(Posture posture)
    {
        var knight = new MapToken
        {
            MapTokenId = 60, MapId = 30, TokenId = 8, CampaignCharacterId = POSTURE_PARTICIPATION, TokenType = MapTokenType.Character, Name = "Aria", X = 4, Y = 4
        };
        _repository.Setup(r => r.GetByIdAsync(60)).ReturnsAsync(knight);
        var participation = new CampaignCharacter
        {
            CampaignCharacterId = POSTURE_PARTICIPATION, CampaignId = 10, CharacterId = 90, Status = CampaignCharacterStatus.Approved, Posture = posture
        };
        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(POSTURE_PARTICIPATION)).ReturnsAsync(participation);
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter> { participation });
        _characterRepository.Setup(r => r.GetByIdAsync(90)).ReturnsAsync(new Character { CharacterId = 90, UserId = 2, Name = "Aria" });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token>
        {
            new() { TokenId = 8, Name = "Cavaleiro", UpSpace = 1, DownSpace = 2 }, new() { TokenId = 5, Name = "Goblin" }
        });
        // Another piece right behind the knight (facing up, behind = (4, 5)).
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken>
        {
            knight, new() { MapTokenId = 70, MapId = 30, TokenId = 5, X = 4, Y = 5 }
        });
    }

    [Fact]
    public async Task SetPosture_LyingDown_TakesTheDownSize_EvenOverAnotherPiece()
    {
        SetupKnight(Posture.Standing);

        var result = await _service.SetPostureAsync(2, 60, new MapTokenPostureInfo { Posture = (int)Posture.Down });

        (result.Posture, result.Space).Should().Be(((int?)Posture.Down, 2));
    }

    [Fact]
    public async Task LyingPiece_BlocksTheHexBehindIt()
    {
        SetupKnight(Posture.Down);
        _repository.Setup(r => r.GetByIdAsync(70)).ReturnsAsync(new MapToken { MapTokenId = 70, MapId = 30, TokenId = 5, Name = "Goblin", TokenType = MapTokenType.Object, X = 4, Y = 5 });
        _repository.Setup(r => r.ListByMapAsync(30)).ReturnsAsync(new List<MapToken>
        {
            new() { MapTokenId = 60, MapId = 30, TokenId = 8, CampaignCharacterId = POSTURE_PARTICIPATION, X = 4, Y = 4 },
            new() { MapTokenId = 70, MapId = 30, TokenId = 5, X = 2, Y = 2 }
        });

        // Facing up, the knight lying at (4, 4) also takes (4, 5).
        await _service.Invoking(s => s.MoveAsync(1, 70, new MapTokenPositionInfo { X = 4, Y = 5 })).Should().ThrowAsync<ConflictException>();
    }
}
