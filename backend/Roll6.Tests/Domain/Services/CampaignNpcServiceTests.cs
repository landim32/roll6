using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.CampaignNpc;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class CampaignNpcServiceTests
{
    private const long MASTER = 1;
    private const long PLAYER = 2;
    private const long CAMPAIGN = 10;
    private const long NPC = 8;
    private const long OTHERS_NPC = 9;

    private readonly Mock<ICampaignNpcRepository<CampaignNpc>> _repository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<INpcRepository<Npc>> _npcRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<IMapNpcRepository<MapNpc>> _mapNpcRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly CampaignNpcService _service;

    public CampaignNpcServiceTests()
    {
        _campaignRepository.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(new Campaign { CampaignId = CAMPAIGN, UserId = MASTER, Name = "C" });
        _npcRepository.Setup(r => r.GetByIdAsync(NPC)).ReturnsAsync(new Npc { NpcId = NPC, UserId = MASTER, TokenId = 5, Name = "Goblin", Life = 7 });
        _npcRepository.Setup(r => r.GetByIdAsync(OTHERS_NPC)).ReturnsAsync(new Npc { NpcId = OTHERS_NPC, UserId = PLAYER, TokenId = 5, Name = "Orc" });
        _npcRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<Npc> { new() { NpcId = NPC, UserId = MASTER, TokenId = 5, Name = "Goblin", Life = 7 } });
        _tokenRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Token> { new() { TokenId = 5 } });
        _repository.Setup(r => r.InsertAsync(It.IsAny<CampaignNpc>())).ReturnsAsync((CampaignNpc c) => c);
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _service = new CampaignNpcService(_repository.Object, _campaignRepository.Object, _npcRepository.Object, _tokenRepository.Object,
            _mapNpcRepository.Object, _mapTokenRepository.Object, _unitOfWork.Object, Mock.Of<IImageStorageAppService>());
    }

    private static CampaignNpcInsertInfo Add(long npcId = NPC) => new() { CampaignId = CAMPAIGN, NpcId = npcId };

    [Fact]
    public async Task Add_Master_ReturnsTheNpcData()
    {
        var result = await _service.AddAsync(MASTER, Add());

        (result.CampaignId, result.NpcId, result.Name, result.Life).Should().Be((CAMPAIGN, NPC, "Goblin", 7));
    }

    [Fact]
    public async Task Add_NotMaster_Throws()
    {
        await _service.Invoking(s => s.AddAsync(PLAYER, Add())).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Add_NpcOfAnotherUser_Throws()
    {
        await _service.Invoking(s => s.AddAsync(MASTER, Add(OTHERS_NPC))).Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<CampaignNpc>()), Times.Never);
    }

    [Fact]
    public async Task Add_Twice_Throws()
    {
        _repository.Setup(r => r.GetAsync(CAMPAIGN, NPC)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 3 });

        await _service.Invoking(s => s.AddAsync(MASTER, Add())).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task List_OnlyTheMaster()
    {
        _repository.Setup(r => r.ListByCampaignAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignNpc> { new() { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC } });

        (await _service.ListByCampaignAsync(MASTER, CAMPAIGN)).Should().ContainSingle(c => c.Name == "Goblin");
        await _service.Invoking(s => s.ListByCampaignAsync(PLAYER, CAMPAIGN)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Remove_DeletesItsOccurrencesAndPiecesFirst()
    {
        _repository.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC });
        var occurrences = new List<long> { 90, 91 };
        _mapNpcRepository.Setup(r => r.ListIdsByCampaignAndNpcAsync(CAMPAIGN, NPC)).ReturnsAsync(occurrences);

        await _service.RemoveAsync(MASTER, 3);

        _mapTokenRepository.Verify(r => r.DeleteByMapNpcIdsAsync(occurrences), Times.Once);
        _mapNpcRepository.Verify(r => r.DeleteRangeAsync(occurrences), Times.Once);
        _repository.Verify(r => r.DeleteAsync(3), Times.Once);
    }

    [Fact]
    public async Task Remove_NotMaster_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC });

        await _service.Invoking(s => s.RemoveAsync(PLAYER, 3)).Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }
}
