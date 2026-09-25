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
    private readonly Mock<IMapTokenRepository<MapToken>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly MapTokenService _service;

    public MapTokenServiceTests()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(30)).ReturnsAsync(new Map { MapId = 30, CampaignId = 10, UserId = 1, Status = MapStatus.Active });
        _tokenRepository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, UserId = 9, Name = "Goblin" });
        _repository.Setup(r => r.InsertAsync(It.IsAny<MapToken>())).ReturnsAsync((MapToken t) => t);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<MapToken>())).ReturnsAsync((MapToken t) => t);
        _service = new MapTokenService(_repository.Object, _mapRepository.Object, _tokenRepository.Object,
            _campaignCharacterRepository.Object, Mock.Of<IImageStorageAppService>());
    }

    [Fact]
    public async Task Create_WithoutName_CopiesTokenName()
    {
        var result = await _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = (int)MapTokenType.Enemy });

        result.Name.Should().Be("Goblin");
        result.TokenType.Should().Be((int)MapTokenType.Enemy);
        result.X.Should().Be(0);
        result.Y.Should().Be(0);
    }

    [Fact]
    public async Task Create_OnMapOfAnotherUser_Throws()
    {
        var act = () => _service.CreateAsync(2, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 1 });

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
            Name = "Goblin", TokenType = (int)MapTokenType.Enemy, Life = 3, X = 2, Y = 0
        });

        result.X.Should().Be(2);
        result.Y.Should().Be(0);
        result.Life.Should().Be(3);
    }

    [Fact]
    public async Task Create_WithoutLook_FacesTop()
    {
        var result = await _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 3 });

        result.Look.Should().Be(0);
    }

    [Fact]
    public async Task Update_KeepsInformedLook()
    {
        _repository.Setup(r => r.GetByIdAsync(40)).ReturnsAsync(new MapToken { MapTokenId = 40, MapId = 30, TokenId = 5, Name = "Goblin" });

        var result = await _service.UpdateAsync(1, 40, new MapTokenUpdateInfo { Name = "Goblin", TokenType = 3, Look = 5 });

        result.Look.Should().Be(5);
    }

    [Theory]
    [InlineData(6)]
    [InlineData(-1)]
    public async Task Create_WithLookOutOfRange_Throws(int look)
    {
        var act = () => _service.CreateAsync(1, new MapTokenInsertInfo { MapId = 30, TokenId = 5, TokenType = 3, Look = look });

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

        var act = () => _service.UpdateAsync(2, 40, new MapTokenUpdateInfo { Name = "Goblin", TokenType = 3 });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
