using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.CampaignNpc;
using Roll6.DTO.Realtime;
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

    private readonly Mock<ITurnRepository<Turn>> _turnRepository = new();
    private readonly Mock<ICampaignNpcRepository<CampaignNpc>> _repository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<INpcRepository<Npc>> _npcRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<IMapNpcRepository<MapNpc>> _mapNpcRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
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
        _mapNpcRepository.Setup(r => r.CountByCampaignAsync(It.IsAny<long>())).ReturnsAsync(new Dictionary<long, int>());
        _mapNpcRepository.Setup(r => r.UpdateAsync(It.IsAny<MapNpc>())).ReturnsAsync((MapNpc m) => m);
        _service = new CampaignNpcService(_repository.Object, _campaignRepository.Object, _npcRepository.Object, _tokenRepository.Object,
            _mapNpcRepository.Object, _mapTokenRepository.Object, _unitOfWork.Object, Mock.Of<IImageStorageAppService>(), _turnRepository.Object,
            _campaignCharacterRepository.Object, _notifier.Object);
    }

    private static CampaignNpcInsertInfo Add(long npcId = NPC) => new() { CampaignId = CAMPAIGN, NpcId = npcId };

    // ---- 071: category and master ----

    private CampaignNpc SetupCampaignNpc(NpcCategory category = NpcCategory.Enemy, long? master = null)
    {
        var campaignNpc = new CampaignNpc { CampaignNpcId = 5, CampaignId = CAMPAIGN, NpcId = NPC, Category = category, MasterCampaignCharacterId = master };
        _repository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(campaignNpc);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<CampaignNpc>())).ReturnsAsync((CampaignNpc c) => c);
        return campaignNpc;
    }

    private void SetupParticipation(CampaignCharacterStatus status = CampaignCharacterStatus.Approved)
    {
        var participation = new CampaignCharacter { CampaignCharacterId = 70, CampaignId = CAMPAIGN, CharacterId = 80, Status = status };
        _campaignCharacterRepository.Setup(r => r.GetByIdAsync(70)).ReturnsAsync(participation);
        _campaignCharacterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<CampaignCharacter> { participation });
    }

    [Fact]
    public async Task Update_TheCategoryAndMaster_AreSavedAndPublished()
    {
        SetupCampaignNpc();
        SetupParticipation();

        var result = await _service.UpdateAsync(MASTER, 5, new CampaignNpcUpdateInfo { Category = 3, MasterCampaignCharacterId = 70 });

        (result.Category, result.MasterCampaignCharacterId, result.MasterCharacterId).Should().Be((3, (long?)70, (long?)80));
        _repository.Verify(r => r.UpdateAsync(It.Is<CampaignNpc>(c => c.Category == NpcCategory.Ally && c.MasterCampaignCharacterId == 70)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CAMPAIGN_NPCS_CHANGED)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKENS_CHANGED && e.MapId == null)), Times.Once);
    }

    [Fact]
    public async Task Update_SameValues_PublishesNothing()
    {
        SetupCampaignNpc(NpcCategory.Neutral);

        var result = await _service.UpdateAsync(MASTER, 5, new CampaignNpcUpdateInfo { Category = 2 });

        result.Category.Should().Be(2);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<CampaignNpc>()), Times.Never);
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task Update_NotTheMaster_Throws403_UnknownThrows404()
    {
        SetupCampaignNpc();

        await _service.Invoking(s => s.UpdateAsync(PLAYER, 5, new CampaignNpcUpdateInfo { Category = 3 })).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.UpdateAsync(MASTER, 404, new CampaignNpcUpdateInfo { Category = 3 })).Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Update_MasterOnANonAllyOrUnknown_Throws400()
    {
        SetupCampaignNpc();
        SetupParticipation();

        (await _service.Invoking(s => s.UpdateAsync(MASTER, 5, new CampaignNpcUpdateInfo { Category = 2, MasterCampaignCharacterId = 70 }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("masterCampaignCharacterId");
        (await _service.Invoking(s => s.UpdateAsync(MASTER, 5, new CampaignNpcUpdateInfo { Category = 3, MasterCampaignCharacterId = 999 }))
            .Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("masterCampaignCharacterId");
    }

    [Fact]
    public async Task List_AMasterNoLongerApproved_ReadsAsNone()
    {
        var campaignNpc = SetupCampaignNpc(NpcCategory.Ally, master: 70);
        SetupParticipation(CampaignCharacterStatus.Denied);
        _repository.Setup(r => r.ListByCampaignAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignNpc> { campaignNpc });

        var result = (await _service.ListByCampaignAsync(MASTER, CAMPAIGN)).Single();

        (result.Category, result.MasterCampaignCharacterId, result.MasterCharacterId).Should().Be((3, (long?)null, (long?)null));
    }

    [Fact]
    public async Task Add_Master_ReturnsTheNpcData()
    {
        var result = await _service.AddAsync(MASTER, Add());

        (result.CampaignId, result.NpcId, result.Name, result.Life).Should().Be((CAMPAIGN, NPC, "Goblin", 7));
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e =>
            e.Type == TableEventType.CAMPAIGN_NPCS_CHANGED && e.CampaignId == CAMPAIGN)), Times.Once);
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
    public async Task List_MasterAndApprovedParticipants_OthersDenied()
    {
        const long STRANGER = 3;
        _repository.Setup(r => r.ListByCampaignAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignNpc> { new() { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC } });
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(CAMPAIGN, PLAYER)).ReturnsAsync(true);

        (await _service.ListByCampaignAsync(MASTER, CAMPAIGN)).Should().ContainSingle(c => c.Name == "Goblin");
        (await _service.ListByCampaignAsync(PLAYER, CAMPAIGN)).Should().ContainSingle(c => c.Name == "Goblin");
        await _service.Invoking(s => s.ListByCampaignAsync(STRANGER, CAMPAIGN)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Remove_TakesItsOccurrencesOffTheMaps_KeepingTheirEntries()
    {
        _repository.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC });
        var occurrences = new List<long> { 90, 91 };
        _mapNpcRepository.Setup(r => r.ListIdsByCampaignAndNpcAsync(CAMPAIGN, NPC)).ReturnsAsync(occurrences);
        var instances = occurrences.Select(id => new MapNpc { MapNpcId = id, MapId = 30, NpcId = NPC, Name = $"Goblin {id}" }).ToList();
        _mapNpcRepository.Setup(r => r.ListByIdsAsync(occurrences)).ReturnsAsync(instances);

        await _service.RemoveAsync(MASTER, 3);

        _mapTokenRepository.Verify(r => r.DeleteByMapNpcIdsAsync(occurrences), Times.Once);
        instances.Should().OnlyContain(i => i.IsRemoved);
        _mapNpcRepository.Verify(r => r.UpdateAsync(It.Is<MapNpc>(m => m.IsRemoved)), Times.Exactly(2));
        _mapNpcRepository.Verify(r => r.DeleteRangeAsync(It.IsAny<IEnumerable<long>>()), Times.Never);
        _turnRepository.Verify(r => r.DeleteByMapNpcIdsAsync(It.IsAny<IEnumerable<long>>()), Times.Never);
        _repository.Verify(r => r.DeleteAsync(3), Times.Once);
    }

    [Fact]
    public async Task List_CarriesHowManyInstancesEachNpcHasOnTheMaps()
    {
        _repository.Setup(r => r.ListByCampaignAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignNpc> { new() { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC } });
        _mapNpcRepository.Setup(r => r.CountByCampaignAsync(CAMPAIGN)).ReturnsAsync(new Dictionary<long, int> { [NPC] = 3 });

        (await _service.ListByCampaignAsync(MASTER, CAMPAIGN)).Single().MapNpcCount.Should().Be(3);
    }

    [Fact]
    public async Task Remove_NotMaster_Throws()
    {
        _repository.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(new CampaignNpc { CampaignNpcId = 3, CampaignId = CAMPAIGN, NpcId = NPC });

        await _service.Invoking(s => s.RemoveAsync(PLAYER, 3)).Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }
}
