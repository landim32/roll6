using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.MapModel;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class MapModelServiceTests
{
    private static readonly DateTime CREATED_AT = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IMapModelRepository<MapModel>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly MapModelService _service;

    public MapModelServiceTests()
    {
        _repository.Setup(r => r.GetByIdAsync(20)).ReturnsAsync(new MapModel
        {
            MapModelId = 20, UserId = 1, Name = "Masmorra", CreatedAt = CREATED_AT, ChangedAt = CREATED_AT
        });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<MapModel>())).ReturnsAsync((MapModel m) => m);
        _mapRepository.Setup(r => r.ListCampaignIdsByModelAsync(It.IsAny<long>())).ReturnsAsync(new List<long>());
        _service = new MapModelService(_repository.Object, _mapRepository.Object, Mock.Of<IImageStorageAppService>(), _notifier.Object);
    }

    [Fact]
    public async Task Update_ChangesChangedAtButNotCreatedAt()
    {
        var result = await _service.UpdateAsync(1, 20, new MapModelInsertInfo { Name = "Masmorra Antiga" });

        result.CreatedAt.Should().Be(CREATED_AT);
        result.ChangedAt.Should().BeAfter(CREATED_AT);
    }

    [Fact]
    public async Task Create_WithoutLayout_UsesDefaults()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<MapModel>())).ReturnsAsync((MapModel m) => m);

        var result = await _service.CreateAsync(1, new MapModelInsertInfo { Name = "Taverna" });

        result.GridWidth.Should().Be(20);
        result.GridHeight.Should().Be(20);
        result.ImageWidth.Should().BeNull();
        result.ImageHeight.Should().BeNull();
        result.ImageTop.Should().Be(0);
        result.ImageLeft.Should().Be(0);
        result.HexSize.Should().Be(40);
    }

    [Fact]
    public async Task Update_StoryFields_AreSavedAndReturned()
    {
        var result = await _service.UpdateAsync(1, 20, new MapModelInsertInfo
        {
            Name = "Masmorra", Kind = 2, Walls = new List<int[]> { new[] { 3, 1 }, new[] { 0, 0 } },
            SkyImage = "0123456789abcdef0123456789abcdef.webp"
        });

        result.Kind.Should().Be(2);
        result.Walls.Select(w => (w[0], w[1])).Should().Equal((0, 0), (3, 1));
        result.SkyImage.Should().Be("0123456789abcdef0123456789abcdef.webp");
    }

    [Fact]
    public async Task Update_WithoutStoryFields_ReplacesThemWithDefaults()
    {
        await _service.UpdateAsync(1, 20, new MapModelInsertInfo
        {
            Name = "Masmorra", Kind = 2, Walls = new List<int[]> { new[] { 1, 1 } }, SkyImage = "0123456789abcdef0123456789abcdef.jpg"
        });

        // PUT replaces every field (033 D2): omitted kind/walls/sky go back to 2D, none, none.
        var result = await _service.UpdateAsync(1, 20, new MapModelInsertInfo { Name = "Masmorra" });

        result.Kind.Should().Be(1);
        result.Walls.Should().BeEmpty();
        result.SkyImage.Should().BeNull();
        result.SkyImageUrl.Should().BeNull();
    }

    [Fact]
    public async Task Update_WithFullLayout_KeepsFixedHexSize()
    {
        var result = await _service.UpdateAsync(1, 20, new MapModelInsertInfo
        {
            Name = "Masmorra", GridWidth = 10, GridHeight = 8, ImageWidth = 1600, ImageHeight = 1400, ImageTop = -30, ImageLeft = 45
        });

        result.GridWidth.Should().Be(10);
        result.GridHeight.Should().Be(8);
        result.ImageWidth.Should().Be(1600);
        result.ImageHeight.Should().Be(1400);
        result.ImageTop.Should().Be(-30);
        result.ImageLeft.Should().Be(45);
        result.HexSize.Should().Be(40);
    }

    [Fact]
    public async Task Update_WithOffsetOutOfRange_DoesNotSave()
    {
        var act = () => _service.UpdateAsync(1, 20, new MapModelInsertInfo
        {
            Name = "Masmorra", ImageWidth = 1600, ImageHeight = 1400, ImageTop = 20001
        });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("imageTop");
        _repository.Verify(r => r.UpdateAsync(It.IsAny<MapModel>()), Times.Never);
    }

    [Fact]
    public async Task Delete_ByAnotherUser_Throws()
    {
        var act = () => _service.DeleteAsync(2, 20);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Delete_ModelInUse_Throws()
    {
        _mapRepository.Setup(r => r.ExistsByMapModelAsync(20)).ReturnsAsync(true);

        var act = () => _service.DeleteAsync(1, 20);

        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task List_Mine_PassesOwnerToRepository()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20, 1)).ReturnsAsync((new List<MapModel>(), 0));

        await _service.ListAsync(new Roll6.DTO.Common.PageQuery(), ownerUserId: 1);

        _repository.Verify(r => r.ListPagedAsync(null, 0, 20, 1));
        _repository.Verify(r => r.ListPagedAsync(It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<int>(), null), Times.Never);
    }

    [Fact]
    public async Task Update_PublishesToEveryCampaignUsingTheModel()
    {
        _mapRepository.Setup(r => r.ListCampaignIdsByModelAsync(20)).ReturnsAsync(new List<long> { 10, 11 });

        await _service.UpdateAsync(1, 20, new MapModelInsertInfo { Name = "Masmorra" });

        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_SAVED)), Times.Exactly(2));
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_SAVED && e.CampaignId == 11)), Times.Once);
    }
}
