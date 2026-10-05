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
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
    private readonly TokenLibraryService _service;

    public TokenLibraryServiceTests()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);
        _repository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, UserId = 1, Name = "Goblin" });
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string>())).Returns((string? name) => name == null ? null : "https://x/" + name);
        _service = new TokenLibraryService(_repository.Object, _mapTokenRepository.Object, _characterRepository.Object, _npcRepository.Object, _imageStorage.Object);
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

    private const string FRONT_IMAGE = "fedcba9876543210fedcba9876543210.png";

    [Fact]
    public async Task Create_WithFrontImage_KeepsIt()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Goblin", FrontImage = FRONT_IMAGE });

        result.FrontImage.Should().Be(FRONT_IMAGE);
    }

    [Fact]
    public async Task Create_WithoutFrontImage_HasNone()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Goblin" });

        result.FrontImage.Should().BeNull();
        result.FrontImageUrl.Should().BeNull();
    }

    [Fact]
    public async Task Create_WithInvalidFrontImage_Throws()
    {
        var act = () => _service.CreateAsync(1, new TokenInsertInfo { Name = "Goblin", FrontImage = "front.gif" });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("frontImage");
    }

    [Fact]
    public async Task Update_WithoutFrontImage_RemovesIt()
    {
        _repository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Token { TokenId = 7, UserId = 1, Name = "Goblin", FrontImage = FRONT_IMAGE });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        // PUT replaces every field: an omitted frontImage is removed, like downImage.
        var result = await _service.UpdateAsync(1, 7, new TokenInsertInfo { Name = "Goblin" });

        result.FrontImage.Should().BeNull();
    }

    private const string RIGHT_IMAGE = "aaaa1111bbbb2222cccc3333dddd4444.png";
    private const string LEFT_IMAGE = "aaaa5555bbbb6666cccc7777dddd8888.png";
    private const string BACK_IMAGE = "aaaa9999bbbb0000cccc1111dddd2222.png";

    [Fact]
    public async Task Create_WithTheFourDirectionImages_KeepsThemAll()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo
        {
            Name = "Guerreira", FrontImage = FRONT_IMAGE, RightImage = RIGHT_IMAGE, LeftImage = LEFT_IMAGE, BackImage = BACK_IMAGE
        });

        result.FrontImage.Should().Be(FRONT_IMAGE);
        result.RightImage.Should().Be(RIGHT_IMAGE);
        result.LeftImage.Should().Be(LEFT_IMAGE);
        result.BackImage.Should().Be(BACK_IMAGE);
        result.RightImageUrl.Should().Be("https://x/" + RIGHT_IMAGE);
        result.LeftImageUrl.Should().Be("https://x/" + LEFT_IMAGE);
        result.BackImageUrl.Should().Be("https://x/" + BACK_IMAGE);
    }

    [Fact]
    public async Task Create_WithoutDirectionImages_HasNoneAndNoUrls()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Guerreira" });

        result.RightImage.Should().BeNull();
        result.LeftImage.Should().BeNull();
        result.BackImage.Should().BeNull();
        result.RightImageUrl.Should().BeNull();
        result.LeftImageUrl.Should().BeNull();
        result.BackImageUrl.Should().BeNull();
    }

    [Theory]
    [InlineData("rightImage")]
    [InlineData("leftImage")]
    [InlineData("backImage")]
    public async Task Create_WithInvalidDirectionImage_ThrowsOnItsOwnKey(string field)
    {
        var info = field switch
        {
            "rightImage" => new TokenInsertInfo { Name = "Guerreira", RightImage = "side.gif" },
            "leftImage" => new TokenInsertInfo { Name = "Guerreira", LeftImage = "side.gif" },
            _ => new TokenInsertInfo { Name = "Guerreira", BackImage = "side.gif" }
        };

        var act = () => _service.CreateAsync(1, info);

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey(field);
    }

    [Fact]
    public async Task Update_OmittingTwoDirectionImages_RemovesOnlyThose()
    {
        _repository.Setup(r => r.GetByIdAsync(8)).ReturnsAsync(new Token
        {
            TokenId = 8, UserId = 1, Name = "Guerreira",
            FrontImage = FRONT_IMAGE, RightImage = RIGHT_IMAGE, LeftImage = LEFT_IMAGE, BackImage = BACK_IMAGE
        });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        // PUT replaces every field: the images that are not sent are removed, the ones sent stay.
        var result = await _service.UpdateAsync(1, 8, new TokenInsertInfo { Name = "Guerreira", FrontImage = FRONT_IMAGE, LeftImage = LEFT_IMAGE });

        result.FrontImage.Should().Be(FRONT_IMAGE);
        result.LeftImage.Should().Be(LEFT_IMAGE);
        result.RightImage.Should().BeNull();
        result.BackImage.Should().BeNull();
    }

    [Fact]
    public async Task Update_ChangingOnlyTheRightImage_KeepsTheOtherThree()
    {
        const string newRight = "aaaa3333bbbb4444cccc5555dddd6666.png";
        _repository.Setup(r => r.GetByIdAsync(9)).ReturnsAsync(new Token
        {
            TokenId = 9, UserId = 1, Name = "Guerreira",
            FrontImage = FRONT_IMAGE, RightImage = RIGHT_IMAGE, LeftImage = LEFT_IMAGE, BackImage = BACK_IMAGE
        });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        var result = await _service.UpdateAsync(1, 9, new TokenInsertInfo
        {
            Name = "Guerreira", FrontImage = FRONT_IMAGE, RightImage = newRight, LeftImage = LEFT_IMAGE, BackImage = BACK_IMAGE
        });

        result.RightImage.Should().Be(newRight);
        result.FrontImage.Should().Be(FRONT_IMAGE);
        result.LeftImage.Should().Be(LEFT_IMAGE);
        result.BackImage.Should().Be(BACK_IMAGE);
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

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(7)]
    [InlineData(10)]
    public async Task Create_WithAllowedSpace_KeepsIt(int space)
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Dragão", UpSpace = space, DownSpace = space });

        result.UpSpace.Should().Be(space);
        result.DownSpace.Should().Be(space);
    }

    [Theory]
    [InlineData(0, null, "upSpace")]
    [InlineData(4, null, "upSpace")]
    [InlineData(1, 0, "downSpace")]
    [InlineData(1, 5, "downSpace")]
    public async Task Create_WithOtherSpace_Throws(int upSpace, int? downSpace, string field)
    {
        var act = () => _service.CreateAsync(1, new TokenInsertInfo { Name = "Moeda", UpSpace = upSpace, DownSpace = downSpace });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey(field);
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
