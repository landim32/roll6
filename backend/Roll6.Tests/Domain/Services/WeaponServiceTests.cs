using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.Domain.Weapons;
using Roll6.DTO.Common;
using Roll6.DTO.Realtime;
using Roll6.DTO.Weapon;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class WeaponServiceTests
{
    private const string FILE = "0123456789abcdef0123456789abcdef.glb";
    private const string OTHER_FILE = "fedcba9876543210fedcba9876543210.glb";

    private readonly Mock<IWeaponRepository<Weapon>> _repository = new();
    private readonly Mock<ITokenWeaponRepository<TokenWeapon>> _tokenWeaponRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly WeaponService _service;

    public WeaponServiceTests()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<Weapon>())).ReturnsAsync((Weapon w) => { w.WeaponId = 7; return w; });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Weapon>())).ReturnsAsync((Weapon w) => w);
        _repository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(() => new Weapon
        {
            WeaponId = 7, UserId = 1, Name = "Espada", ModelFile = FILE
        });
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<User> { new() { UserId = 1, Name = "Rodrigo" } });
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string>())).Returns((string? name) => name == null ? null : "https://x/" + name);
        _mapTokenRepository.Setup(r => r.ListCampaignIdsByWeaponAsync(7)).ReturnsAsync(new List<long> { 30, 31 });
        _service = new WeaponService(_repository.Object, _tokenWeaponRepository.Object, _mapTokenRepository.Object,
            _userRepository.Object, _imageStorage.Object, _notifier.Object);
    }

    [Fact]
    public async Task Create_InsertsTheWeaponOfTheUser()
    {
        var result = await _service.CreateAsync(1, new WeaponInsertInfo { Name = "Espada longa", ModelFile = FILE });

        result.WeaponId.Should().Be(7);
        result.Name.Should().Be("Espada longa");
        result.OwnerName.Should().Be("Rodrigo");
        result.ModelFile.Should().Be(FILE);
        result.ModelFileUrl.Should().Be("https://x/" + FILE);
        result.GripPoint.X.Should().Be(0.5);
        result.Pose.Rz.Should().Be(0);
        _repository.Verify(r => r.InsertAsync(It.Is<Weapon>(w => w.UserId == 1 && w.ModelFile == FILE)), Times.Once);
    }

    [Fact]
    public async Task Create_WithGripPointAndPose_StoresThem()
    {
        var result = await _service.CreateAsync(1, new WeaponInsertInfo
        {
            Name = "Espada", ModelFile = FILE,
            GripPoint = new WeaponGripPointInfo { X = 0.5, Y = 0.1, Z = 0.5 }, Pose = new WeaponPoseInfo { Rz = -90 }
        });

        result.GripPoint.Y.Should().Be(0.1);
        result.Pose.Rz.Should().Be(270);
    }

    [Fact]
    public async Task Create_PoseNotAStep_InsertsNothing()
    {
        var act = () => _service.CreateAsync(1, new WeaponInsertInfo { Name = "Espada", ModelFile = FILE, Pose = new WeaponPoseInfo { Rx = 45 } });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("pose.rx");
        _repository.Verify(r => r.InsertAsync(It.IsAny<Weapon>()), Times.Never);
    }

    [Fact]
    public async Task Create_WithoutFile_InsertsNothing()
    {
        var act = () => _service.CreateAsync(1, new WeaponInsertInfo { Name = "Espada", ModelFile = "" });

        await act.Should().ThrowAsync<DomainValidationException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<Weapon>()), Times.Never);
    }

    [Fact]
    public async Task List_MineFiltersByTheViewer()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20, 1, 1))
            .ReturnsAsync((new List<Weapon> { new() { WeaponId = 7, UserId = 1, Name = "Espada", ModelFile = FILE } }, 1));

        var result = await _service.ListAsync(1, new PageQuery { Page = 1, PageSize = 20 }, mine: true);

        result.TotalCount.Should().Be(1);
        result.Items.Single().OwnerName.Should().Be("Rodrigo");
    }

    [Fact]
    public async Task Get_Unknown_IsNotFound()
    {
        var act = () => _service.GetByIdAsync(99);

        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage(WeaponService.NOT_FOUND);
    }

    [Fact]
    public async Task Update_ByAnotherUser_IsForbidden()
    {
        var act = () => _service.UpdateAsync(2, 7, new WeaponUpdateInfo { Name = "Minha" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Weapon>()), Times.Never);
    }

    [Fact]
    public async Task Update_NameOnly_KeepsTheFileAndPublishesNothing()
    {
        var result = await _service.UpdateAsync(1, 7, new WeaponUpdateInfo { Name = "Machado" });

        result.Name.Should().Be("Machado");
        result.ModelFile.Should().Be(FILE);
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task Update_NewFile_KeepsTheIdAndTellsEveryCampaign()
    {
        var result = await _service.UpdateAsync(1, 7, new WeaponUpdateInfo { ModelFile = OTHER_FILE });

        result.WeaponId.Should().Be(7);
        result.ModelFile.Should().Be(OTHER_FILE);
        result.Name.Should().Be("Espada");
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e =>
            e.Type == TableEventType.MAP_TOKENS_CHANGED && e.CampaignId == 30 && e.MapId == null)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.CampaignId == 31)), Times.Once);
        _imageStorage.Verify(s => s.DeleteAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Update_PoseOnly_TellsEveryCampaign()
    {
        var result = await _service.UpdateAsync(1, 7, new WeaponUpdateInfo { Pose = new WeaponPoseInfo { Ry = 90 } });

        result.Pose.Ry.Should().Be(90);
        result.ModelFile.Should().Be(FILE);
        _repository.Verify(r => r.UpdateAsync(It.Is<Weapon>(w => w.PoseRy == 90)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKENS_CHANGED && e.CampaignId == 30)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.CampaignId == 31)), Times.Once);
    }

    [Fact]
    public async Task Update_GripPointOnly_TellsEveryCampaign()
    {
        var result = await _service.UpdateAsync(1, 7, new WeaponUpdateInfo { GripPoint = new WeaponGripPointInfo { X = 0.5, Y = 0.2, Z = 0.5 } });

        result.GripPoint.Y.Should().Be(0.2);
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Exactly(2));
    }

    [Fact]
    public async Task Update_SamePoseAndGripPoint_PublishesNothing()
    {
        await _service.UpdateAsync(1, 7, new WeaponUpdateInfo { Pose = new WeaponPoseInfo(), GripPoint = new WeaponGripPointInfo() });

        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task Update_PoseNotAStep_IsRefused()
    {
        var act = () => _service.UpdateAsync(1, 7, new WeaponUpdateInfo { Pose = new WeaponPoseInfo { Rx = 45 } });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("pose.rx");
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Weapon>()), Times.Never);
    }

    [Fact]
    public async Task Delete_InUse_IsAConflict()
    {
        _tokenWeaponRepository.Setup(r => r.AnyByWeaponAsync(7)).ReturnsAsync(true);

        var act = () => _service.DeleteAsync(1, 7);

        await act.Should().ThrowAsync<ConflictException>().WithMessage(WeaponService.IN_USE);
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Delete_NotInUse_DeletesTheRowAndKeepsTheFile()
    {
        await _service.DeleteAsync(1, 7);

        _repository.Verify(r => r.DeleteAsync(7), Times.Once);
        _imageStorage.Verify(s => s.DeleteAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Delete_ByAnotherUser_IsForbidden()
    {
        var act = () => _service.DeleteAsync(2, 7);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
