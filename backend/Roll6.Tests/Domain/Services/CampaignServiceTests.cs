using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Campaign;
using Roll6.DTO.Common;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class CampaignServiceTests
{
    private readonly Mock<ITurnRepository<Turn>> _turnRepository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<ICampaignNpcRepository<CampaignNpc>> _campaignNpcRepository = new();
    private readonly Mock<IMapNpcRepository<MapNpc>> _mapNpcRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<ICampaignPlanRepository<CampaignPlan>> _campaignPlanRepository = new();
    private readonly CampaignService _service;

    public CampaignServiceTests()
    {
        _repository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Campaign { CampaignId = 10, UserId = 1, Name = "Campanha" });
        _repository.Setup(r => r.InsertAsync(It.IsAny<Campaign>())).ReturnsAsync((Campaign c) => c);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Campaign>())).ReturnsAsync((Campaign c) => c);
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<User>
        {
            new() { UserId = 1, Name = "Mestre Ana" },
            new() { UserId = 2, Name = "Bruno" }
        });
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns<Func<Task>>(action => action());
        _service = new CampaignService(_repository.Object, _mapRepository.Object, _mapTokenRepository.Object,
            _campaignCharacterRepository.Object, _userRepository.Object, _campaignNpcRepository.Object, _mapNpcRepository.Object,
            _unitOfWork.Object, _turnRepository.Object, _notifier.Object, _campaignPlanRepository.Object);
    }

    [Fact]
    public async Task Delete_WithActiveMaps_Throws()
    {
        _mapRepository.Setup(r => r.CountNotDeletedByCampaignAsync(10)).ReturnsAsync(1);

        var act = () => _service.DeleteAsync(1, 10);

        await act.Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Delete_RemovesDeletedMapsTokensAndParticipationsFirst()
    {
        var deletedMapIds = new List<long> { 30, 31 };
        _mapRepository.Setup(r => r.CountNotDeletedByCampaignAsync(10)).ReturnsAsync(0);
        _mapRepository.Setup(r => r.ListDeletedIdsByCampaignAsync(10)).ReturnsAsync(deletedMapIds);

        await _service.DeleteAsync(1, 10);

        _mapTokenRepository.Verify(r => r.DeleteByMapIdsAsync(deletedMapIds));
        _mapNpcRepository.Verify(r => r.DeleteByMapIdsAsync(deletedMapIds));
        _mapRepository.Verify(r => r.DeleteRangeAsync(deletedMapIds));
        _campaignNpcRepository.Verify(r => r.DeleteByCampaignAsync(10));
        _campaignCharacterRepository.Verify(r => r.DeleteByCampaignAsync(10));
        _repository.Verify(r => r.DeleteAsync(10));
    }

    [Fact]
    public async Task GetById_ByAnotherUser_ReturnsCampaignWithOwnerName()
    {
        var result = await _service.GetByIdAsync(10);

        result.Name.Should().Be("Campanha");
        result.OwnerName.Should().Be("Mestre Ana");
    }

    [Fact]
    public async Task List_ReturnsCampaignsOfAllUsersWithOwnerNames()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20, null)).ReturnsAsync((new List<Campaign>
        {
            new() { CampaignId = 10, UserId = 1, Name = "Campanha", Open = true },
            new() { CampaignId = 11, UserId = 2, Name = "Outra" }
        }, 2));

        var result = await _service.ListAsync(new PageQuery());

        result.TotalCount.Should().Be(2);
        result.Items.Select(i => (i.Name, i.OwnerName, i.Open)).Should().Equal(("Campanha", "Mestre Ana", true), ("Outra", "Bruno", false));
    }

    [Fact]
    public async Task GetBySlug_Existing_ReturnsCampaign()
    {
        _repository.Setup(r => r.GetBySlugAsync("campanha")).ReturnsAsync(new Campaign
        {
            CampaignId = 10, UserId = 1, Name = "Campanha", Slug = "campanha"
        });

        var result = await _service.GetBySlugAsync("campanha");

        result.CampaignId.Should().Be(10);
        result.Slug.Should().Be("campanha");
        result.OwnerName.Should().Be("Mestre Ana");
    }

    [Fact]
    public async Task ListTable_SetsMasterAndKeepsMissingMapNull()
    {
        _repository.Setup(r => r.ListTableAsync(1)).ReturnsAsync(new List<CampaignTableRow>
        {
            new() { CampaignId = 10, UserId = 1, Name = "Tormento Vil", Slug = "tormento-vil", CurrentMapId = 12, CurrentMapName = "Estrada 1", CurrentMapSlug = "estrada-1" },
            new() { CampaignId = 9, UserId = 2, Name = "Teste 2", Slug = "teste-2" }
        });

        var result = await _service.ListTableAsync(1);

        result.Should().HaveCount(2);
        result[0].IsMaster.Should().BeTrue();
        result[0].CurrentMapSlug.Should().Be("estrada-1");
        result[1].IsMaster.Should().BeFalse();
        result[1].CurrentMapId.Should().BeNull();
        result[1].CurrentMapName.Should().BeNull();
        result[1].CurrentMapSlug.Should().BeNull();
    }

    [Fact]
    public async Task GetBySlug_Missing_ThrowsNotFound()
    {
        await _service.Invoking(s => s.GetBySlugAsync("nao-existe")).Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Create_ReturnsSlugStoredByRepository()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<Campaign>())).ReturnsAsync((Campaign c) =>
        {
            c.AssignSlug("nova");
            return c;
        });

        var result = await _service.CreateAsync(1, new CampaignInsertInfo { Name = "Nova" });

        result.Slug.Should().Be("nova");
    }

    [Fact]
    public async Task Rename_DoesNotChangeSlug()
    {
        _repository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Campaign
        {
            CampaignId = 10, UserId = 1, Name = "Campanha", Slug = "campanha"
        });

        var result = await _service.RenameAsync(1, 10, new CampaignInsertInfo { Name = "Nova" });

        result.Name.Should().Be("Nova");
        result.Slug.Should().Be("campanha");
        _repository.Verify(r => r.UpdateAsync(It.Is<Campaign>(c => c.Slug == "campanha" && c.Name == "Nova")));
    }

    [Fact]
    public async Task Create_WithoutOpen_IsClosed()
    {
        var result = await _service.CreateAsync(1, new CampaignInsertInfo { Name = "Nova" });

        result.Open.Should().BeFalse();
        result.OwnerName.Should().Be("Mestre Ana");
    }

    [Fact]
    public async Task SetOpen_ByMaster_OpensCampaign()
    {
        var result = await _service.SetOpenAsync(1, 10, new CampaignOpenInfo { Open = true });

        result.Open.Should().BeTrue();
    }

    [Fact]
    public async Task SetOpen_ByAnotherUser_Throws()
    {
        var act = () => _service.SetOpenAsync(2, 10, new CampaignOpenInfo { Open = true });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Rename_ByAnotherUser_Throws()
    {
        var act = () => _service.RenameAsync(2, 10, new CampaignInsertInfo { Name = "Roubada" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task List_Mine_PassesOwnerToRepository()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20, 1)).ReturnsAsync((new List<Campaign>
        {
            new() { CampaignId = 10, UserId = 1, Name = "Campanha" }
        }, 1));

        var result = await _service.ListAsync(new PageQuery(), ownerUserId: 1);

        result.Items.Should().ContainSingle(c => c.CampaignId == 10);
        _repository.Verify(r => r.ListPagedAsync(null, 0, 20, 1));
    }

    // --- 017: real-time table ---

    private void Published(string type, Times times) =>
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == type && e.CampaignId == 10)), times);

    [Fact]
    public async Task CanRead_MasterAndApprovedParticipants()
    {
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(10, 2)).ReturnsAsync(true);

        (await _service.CanReadAsync(1, 10)).Should().BeTrue();
        (await _service.CanReadAsync(2, 10)).Should().BeTrue();
        (await _service.CanReadAsync(3, 10)).Should().BeFalse();
        await _service.Invoking(s => s.CanReadAsync(1, 99)).Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task SetCurrentMap_Master_SavesAndPublishes()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(30)).ReturnsAsync(new Map { MapId = 30, CampaignId = 10, Status = MapStatus.Active });

        var result = await _service.SetCurrentMapAsync(1, 10, new CampaignCurrentMapInfo { MapId = 30 });

        result.CurrentMapId.Should().Be(30);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e =>
            e.Type == TableEventType.MAP_CURRENT && e.CampaignId == 10 && e.MapId == 30 && e.ActorUserId == 1)), Times.Once);
    }

    [Fact]
    public async Task SetCurrentMap_SameMap_DoesNotPublish()
    {
        _repository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Campaign { CampaignId = 10, UserId = 1, Name = "C", CurrentMapId = 30 });
        _mapRepository.Setup(r => r.GetByIdAsync(30)).ReturnsAsync(new Map { MapId = 30, CampaignId = 10, Status = MapStatus.Active });

        await _service.SetCurrentMapAsync(1, 10, new CampaignCurrentMapInfo { MapId = 30 });

        _repository.Verify(r => r.UpdateAsync(It.IsAny<Campaign>()), Times.Never);
        Published(TableEventType.MAP_CURRENT, Times.Never());
    }

    [Fact]
    public async Task SetCurrentMap_PlayerOrForeignOrDeletedMap_Throws()
    {
        _mapRepository.Setup(r => r.GetByIdAsync(31)).ReturnsAsync(new Map { MapId = 31, CampaignId = 11, Status = MapStatus.Active });
        _mapRepository.Setup(r => r.GetByIdAsync(32)).ReturnsAsync(new Map { MapId = 32, CampaignId = 10, Status = MapStatus.Deleted });

        await _service.Invoking(s => s.SetCurrentMapAsync(2, 10, new CampaignCurrentMapInfo { MapId = 31 }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.SetCurrentMapAsync(1, 10, new CampaignCurrentMapInfo { MapId = 31 }))
            .Should().ThrowAsync<DomainValidationException>();
        await _service.Invoking(s => s.SetCurrentMapAsync(1, 10, new CampaignCurrentMapInfo { MapId = 32 }))
            .Should().ThrowAsync<DomainValidationException>();
        Published(TableEventType.MAP_CURRENT, Times.Never());
    }

    [Fact]
    public async Task RenameAndDelete_PublishCampaignEvents()
    {
        _mapRepository.Setup(r => r.ListDeletedIdsByCampaignAsync(10)).ReturnsAsync(new List<long>());
        await _service.RenameAsync(1, 10, new CampaignInsertInfo { Name = "Nova" });
        await _service.DeleteAsync(1, 10);

        Published(TableEventType.CAMPAIGN_CHANGED, Times.Once());
        Published(TableEventType.CAMPAIGN_DELETED, Times.Once());
        // Its plan entries go with it (018).
        _campaignPlanRepository.Verify(r => r.DeleteByCampaignAsync(10), Times.Once);
    }

    [Fact]
    public async Task Rename_ByAnotherUser_DoesNotPublish()
    {
        await _service.Invoking(s => s.RenameAsync(2, 10, new CampaignInsertInfo { Name = "X" })).Should().ThrowAsync<UnauthorizedAccessException>();

        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }
}
