using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Common;
using Roll6.DTO.Npc;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class NpcServiceTests
{
    private const long OWNER = 1;
    private const long OTHER = 2;
    private const long NPC = 8;

    private readonly Mock<ITurnRepository<Turn>> _turnRepository = new();
    private readonly Mock<INpcRepository<Npc>> _repository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<ICampaignNpcRepository<CampaignNpc>> _campaignNpcRepository = new();
    private readonly NpcService _service;

    public NpcServiceTests()
    {
        _tokenRepository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, Name = "Goblin" });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token> { new() { TokenId = 5, Name = "Goblin" } });
        _repository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(() => new Npc { NpcId = NPC, UserId = OWNER, TokenId = 5, Name = "Goblin" });
        _repository.Setup(r => r.InsertAsync(It.IsAny<Npc>())).ReturnsAsync((Npc n) => n);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Npc>())).ReturnsAsync((Npc n) => n);
        _service = new NpcService(_repository.Object, _tokenRepository.Object, _campaignNpcRepository.Object, Mock.Of<IImageStorageAppService>(), _turnRepository.Object);
    }

    private static NpcInsertInfo Info(long tokenId = 5) => new() { TokenId = tokenId, Name = "Goblin", Life = 7, Move = 6 };

    [Fact]
    public async Task Create_OwnedByTheUserWithTheToken()
    {
        var result = await _service.CreateAsync(OWNER, Info());

        (result.UserId, result.TokenId, result.TokenName, result.Life).Should().Be((OWNER, 5L, "Goblin", 7));
    }

    [Fact]
    public async Task Create_WithUnknownToken_Throws()
    {
        await _service.Invoking(s => s.CreateAsync(OWNER, Info(tokenId: 99))).Should().ThrowAsync<KeyNotFoundException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<Npc>()), Times.Never);
    }

    [Fact]
    public async Task Create_WithoutToken_Throws()
    {
        (await _service.Invoking(s => s.CreateAsync(OWNER, Info(tokenId: 0))).Should().ThrowAsync<DomainValidationException>())
            .Which.Errors.Should().ContainKey("tokenId");
    }

    [Fact]
    public async Task List_OnlyTheUsersNpcs()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20, OWNER))
            .ReturnsAsync((new List<Npc> { new() { NpcId = NPC, UserId = OWNER, TokenId = 5, Name = "Goblin" } }, 1));

        var result = await _service.ListAsync(OWNER, new PageQuery());

        result.Items.Should().ContainSingle(n => n.NpcId == NPC);
        _repository.Verify(r => r.ListPagedAsync(null, 0, 20, OWNER), Times.Once);
    }

    [Fact]
    public async Task GetUpdateDelete_ByAnotherUser_Throw()
    {
        await _service.Invoking(s => s.GetByIdAsync(OTHER, NPC)).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.UpdateAsync(OTHER, NPC, Info())).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.DeleteAsync(OTHER, NPC)).Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Npc>()), Times.Never);
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Delete_InACampaign_Throws_OtherwiseDeletes()
    {
        _campaignNpcRepository.Setup(r => r.ExistsByNpcAsync(NPC)).ReturnsAsync(true);
        await _service.Invoking(s => s.DeleteAsync(OWNER, NPC)).Should().ThrowAsync<ConflictException>();

        _campaignNpcRepository.Setup(r => r.ExistsByNpcAsync(NPC)).ReturnsAsync(false);
        await _service.DeleteAsync(OWNER, NPC);

        _repository.Verify(r => r.DeleteAsync(NPC), Times.Once);
    }
}
