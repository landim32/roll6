using FluentAssertions;
using Moq;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Domain.Services;
using SimpleTabletopMap.DTO.MapModel;
using SimpleTabletopMap.Infra.Interfaces.AppServices;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Tests.Domain.Services;

public class MapModelServiceTests
{
    private static readonly DateTime CREATED_AT = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IMapModelRepository<MapModel>> _repository = new();
    private readonly Mock<IMapRepository<Map>> _mapRepository = new();
    private readonly MapModelService _service;

    public MapModelServiceTests()
    {
        _repository.Setup(r => r.GetByIdAsync(20)).ReturnsAsync(new MapModel
        {
            MapModelId = 20, UserId = 1, Name = "Masmorra", CreatedAt = CREATED_AT, ChangedAt = CREATED_AT
        });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<MapModel>())).ReturnsAsync((MapModel m) => m);
        _service = new MapModelService(_repository.Object, _mapRepository.Object, Mock.Of<IImageStorageAppService>());
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

        await _service.ListAsync(new SimpleTabletopMap.DTO.Common.PageQuery(), ownerUserId: 1);

        _repository.Verify(r => r.ListPagedAsync(null, 0, 20, 1));
        _repository.Verify(r => r.ListPagedAsync(It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<int>(), null), Times.Never);
    }
}
