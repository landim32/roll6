using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Map;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class MapServiceTests
{
    private const long OWNER_ID = 1;
    private const long OTHER_USER_ID = 2;

    private readonly Mock<IMapRepository<Map>> _repository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<IMapModelRepository<MapModel>> _mapModelRepository = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly MapService _service;

    public MapServiceTests()
    {
        _campaignRepository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Campaign { CampaignId = 10, UserId = OWNER_ID, Name = "Campanha" });
        _mapModelRepository.Setup(r => r.GetByIdAsync(20)).ReturnsAsync(new MapModel { MapModelId = 20, UserId = OTHER_USER_ID, Name = "Masmorra" });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Map>())).ReturnsAsync((Map m) => m);
        _service = new MapService(_repository.Object, _campaignRepository.Object, _mapModelRepository.Object,
            _campaignCharacterRepository.Object, Mock.Of<IImageStorageAppService>());
    }

    private void SetupMap(MapStatus status = MapStatus.Active) =>
        _repository.Setup(r => r.GetByIdAsync(30)).ReturnsAsync(new Map
        {
            MapId = 30, CampaignId = 10, MapModelId = 20, UserId = OWNER_ID, Sequence = 1, Name = "Masmorra 1", Status = status
        });

    [Fact]
    public async Task Create_NamesMapAfterModelUsingNextSequence()
    {
        _repository.Setup(r => r.InsertWithNextSequenceAsync(It.IsAny<Map>(), "Masmorra"))
            .ReturnsAsync((Map map, string modelName) =>
            {
                map.Sequence = 2;
                map.Name = $"{modelName} {map.Sequence}";
                return map;
            });

        var result = await _service.CreateAsync(OWNER_ID, new MapInsertInfo { CampaignId = 10, MapModelId = 20 });

        result.Name.Should().Be("Masmorra 2");
        result.Status.Should().Be((int)MapStatus.Active);
        result.UserId.Should().Be(OWNER_ID);
    }

    [Fact]
    public async Task Create_InCampaignOfAnotherUser_Throws()
    {
        var act = () => _service.CreateAsync(OTHER_USER_ID, new MapInsertInfo { CampaignId = 10, MapModelId = 20 });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Update_ToDeletedStatus_Throws()
    {
        SetupMap();

        var act = () => _service.UpdateAsync(OWNER_ID, 30, new MapUpdateInfo { Name = "Masmorra 1", Status = (int)MapStatus.Deleted });

        await act.Should().ThrowAsync<DomainValidationException>();
    }

    [Fact]
    public async Task Update_Archive_ChangesStatus()
    {
        SetupMap();

        var result = await _service.UpdateAsync(OWNER_ID, 30, new MapUpdateInfo { Name = "Masmorra 1", Status = (int)MapStatus.Archived });

        result.Status.Should().Be((int)MapStatus.Archived);
    }

    [Fact]
    public async Task GetById_DeletedMap_ThrowsNotFound()
    {
        SetupMap(MapStatus.Deleted);

        var act = () => _service.GetByIdAsync(OWNER_ID, 30);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Delete_ByAnotherUser_Throws()
    {
        SetupMap();

        var act = () => _service.DeleteAsync(OTHER_USER_ID, 30);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Delete_MarksMapAsDeleted()
    {
        SetupMap();

        await _service.DeleteAsync(OWNER_ID, 30);

        _repository.Verify(r => r.UpdateAsync(It.Is<Map>(m => m.Status == MapStatus.Deleted)));
    }

    [Fact]
    public async Task GetById_ByApprovedParticipant_ReturnsMap()
    {
        SetupMap();
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(10, OTHER_USER_ID)).ReturnsAsync(true);

        var result = await _service.GetByIdAsync(OTHER_USER_ID, 30);

        result.MapId.Should().Be(30);
    }

    [Fact]
    public async Task ListByCampaign_ByApprovedParticipant_ReturnsMaps()
    {
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(10, OTHER_USER_ID)).ReturnsAsync(true);
        _repository.Setup(r => r.ListByCampaignPagedAsync(10, 0, 20)).ReturnsAsync((new List<Map>(), 0));
        _mapModelRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<MapModel>());

        var result = await _service.ListByCampaignAsync(OTHER_USER_ID, 10, new Roll6.DTO.Common.PageQuery());

        result.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task ListByCampaign_WithoutApprovedCharacter_Throws()
    {
        var act = () => _service.ListByCampaignAsync(OTHER_USER_ID, 10, new Roll6.DTO.Common.PageQuery());

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Update_ByApprovedParticipant_Throws()
    {
        SetupMap();
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(10, OTHER_USER_ID)).ReturnsAsync(true);

        var act = () => _service.UpdateAsync(OTHER_USER_ID, 30, new MapUpdateInfo { Name = "X", Status = 1 });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
