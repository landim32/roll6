using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Token;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class TokenLibraryServiceTests
{
    private readonly Mock<ITokenRepository<Token>> _repository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<ICharacterRepository<Character>> _characterRepository = new();
    private readonly Mock<INpcRepository<Npc>> _npcRepository = new();
    private readonly TokenLibraryService _service;

    public TokenLibraryServiceTests()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);
        _repository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, UserId = 1, Name = "Goblin" });
        _service = new TokenLibraryService(_repository.Object, _mapTokenRepository.Object, _characterRepository.Object, _npcRepository.Object, Mock.Of<IImageStorageAppService>());
    }

    private const string DOWN_IMAGE = "0123456789abcdef0123456789abcdef.png";

    [Fact]
    public async Task Create_WithoutSpacesAndDownImage_HasNoDownState()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Baú" });

        result.UpSpace.Should().Be(1);
        result.DownSpace.Should().BeNull();
        result.DownImage.Should().BeNull();
    }

    [Fact]
    public async Task Create_WithDownImageAndNoDownSpace_UsesDefaultDownSpace()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Goblin", DownImage = DOWN_IMAGE });

        result.DownSpace.Should().Be(2);
        result.DownImage.Should().Be(DOWN_IMAGE);
    }

    [Fact]
    public async Task Create_WithDownSpaceAndNoDownImage_KeepsInformedValue()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Ogro", DownSpace = 3 });

        result.DownSpace.Should().Be(3);
        result.DownImage.Should().BeNull();
    }

    [Fact]
    public async Task Update_RemovingDownImageAndDownSpace_ClearsDownState()
    {
        _repository.Setup(r => r.GetByIdAsync(6)).ReturnsAsync(new Token
        {
            TokenId = 6, UserId = 1, Name = "Goblin", DownSpace = 2, DownImage = DOWN_IMAGE
        });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        var result = await _service.UpdateAsync(1, 6, new TokenInsertInfo { Name = "Goblin" });

        result.DownSpace.Should().BeNull();
        result.DownImage.Should().BeNull();
    }

    [Fact]
    public async Task Create_WithZeroSpace_KeepsZero()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Moeda", UpSpace = 0, DownSpace = 0 });

        result.UpSpace.Should().Be(0);
        result.DownSpace.Should().Be(0);
    }

    [Fact]
    public async Task Create_WithNegativeSpace_Throws()
    {
        var act = () => _service.CreateAsync(1, new TokenInsertInfo { Name = "Goblin", UpSpace = -1 });

        await act.Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Create_WithImageOutsideUploadFolder_Throws()
    {
        var act = () => _service.CreateAsync(1, new TokenInsertInfo { Name = "Goblin", UpImage = "../secret.png" });

        await act.Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Update_ByAnotherUser_Throws()
    {
        var act = () => _service.UpdateAsync(2, 5, new TokenInsertInfo { Name = "Orc" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Delete_TokenInUse_Throws()
    {
        _mapTokenRepository.Setup(r => r.ExistsByTokenAsync(5)).ReturnsAsync(true);

        var act = () => _service.DeleteAsync(1, 5);

        await act.Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Delete_TokenOfACharacter_Throws()
    {
        _characterRepository.Setup(r => r.ExistsByTokenAsync(5)).ReturnsAsync(true);

        var act = () => _service.DeleteAsync(1, 5);

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*personagens*");
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Theory]
    [InlineData(1L)]
    [InlineData(null)]
    public async Task List_PassesTheOwnerFilter(long? ownerUserId)
    {
        _repository.Setup(r => r.ListPagedAsync("gob", 0, 12, ownerUserId))
            .ReturnsAsync((new List<Token> { new() { TokenId = 5, UserId = 1, Name = "Goblin" } }, 1));

        var result = await _service.ListAsync(new DTO.Common.PageQuery { Search = "gob", PageSize = 12 }, ownerUserId);

        result.Items.Should().ContainSingle(t => t.TokenId == 5);
        _repository.Verify(r => r.ListPagedAsync("gob", 0, 12, ownerUserId), Times.Once);
    }

    [Fact]
    public async Task Delete_TokenOfAnNpc_Throws()
    {
        _npcRepository.Setup(r => r.ExistsByTokenAsync(5)).ReturnsAsync(true);

        var act = () => _service.DeleteAsync(1, 5);

        await act.Should().ThrowAsync<ConflictException>().WithMessage("*NPCs*");
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }
}
