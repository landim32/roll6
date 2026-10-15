using System.Text.Json;
using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Animation;
using Roll6.DTO.Common;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class AnimationServiceTests
{
    private const string FILE = "0123456789abcdef0123456789abcdef.json";

    private readonly Mock<IAnimationRepository<Animation>> _repository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<IImageService> _imageService = new();
    private readonly AnimationService _service;

    private static readonly JsonElement VALID = JsonDocument.Parse("""
        { "format": "roll6-animation", "version": 1, "duration": 1.2, "loop": false,
          "tracks": [ { "bone": "RightArm", "times": [0, 1.2], "degrees": [[0, 0, 0], [-90, 0, 0]] } ] }
        """).RootElement;

    public AnimationServiceTests()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<Animation>())).ReturnsAsync((Animation a) => { a.AnimationId = 10; return a; });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Animation>())).ReturnsAsync((Animation a) => a);
        _repository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(() => new Animation
        {
            AnimationId = 10, UserId = 1, Name = "Aceno", AnimationType = AnimationType.Idle, FileName = FILE, Duration = 1, Loop = true
        });
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync(new List<User> { new() { UserId = 1, Name = "Rodrigo" } });
        _imageService.Setup(s => s.StoreAnimationAsync(It.IsAny<byte[]>())).ReturnsAsync(FILE);
        _service = new AnimationService(_repository.Object, _tokenRepository.Object, _userRepository.Object, _imageService.Object);
    }

    [Fact]
    public async Task Create_StoresTheFileAndInsertsTheRow()
    {
        var result = await _service.CreateAsync(1, new AnimationInsertInfo { Name = "Golpe", Type = 6, Content = VALID });

        result.AnimationId.Should().Be(10);
        result.Type.Should().Be(6);
        result.Duration.Should().Be(1.2);
        result.Loop.Should().BeFalse();
        result.OwnerName.Should().Be("Rodrigo");
        result.FileUrl.Should().Be("/api/animation/10/file");
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Once);
        _repository.Verify(r => r.InsertAsync(It.Is<Animation>(a => a.FileName == FILE && a.UserId == 1)), Times.Once);
    }

    [Fact]
    public async Task Create_InvalidContent_StoresNothing()
    {
        var bad = JsonDocument.Parse("""{ "format": "roll6-animation", "version": 2 }""").RootElement;

        var act = () => _service.CreateAsync(1, new AnimationInsertInfo { Name = "Golpe", Type = 6, Content = bad });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("content.version");
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Never);
    }

    [Fact]
    public async Task Create_InvalidType_StoresNothing()
    {
        var act = () => _service.CreateAsync(1, new AnimationInsertInfo { Name = "Golpe", Type = 9, Content = VALID });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("type");
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Never);
    }

    [Fact]
    public async Task Create_FailedInsert_RemovesTheStoredFile()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<Animation>())).ThrowsAsync(new Exception("db"));

        var act = () => _service.CreateAsync(1, new AnimationInsertInfo { Name = "Golpe", Type = 6, Content = VALID });

        await act.Should().ThrowAsync<Exception>();
        _imageService.Verify(s => s.DeleteAnimationAsync(FILE), Times.Once);
    }

    [Theory]
    [InlineData(true, 1L)]
    [InlineData(false, null)]
    public async Task List_PassesTheFilters(bool mine, long? owner)
    {
        _repository.Setup(r => r.ListPagedAsync("ace", 0, 12, owner, 1, 1))
            .ReturnsAsync((new List<Animation> { new() { AnimationId = 10, UserId = 1, Name = "Aceno", AnimationType = AnimationType.Idle } }, 1));

        var result = await _service.ListAsync(1, new PageQuery { Search = "ace", PageSize = 12 }, mine, 1);

        result.Items.Should().ContainSingle(a => a.AnimationId == 10 && a.OwnerName == "Rodrigo");
        result.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task Get_Unknown_Throws()
    {
        var act = () => _service.GetByIdAsync(99);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Update_ByTheOwner_RenamesAndRetypes()
    {
        var result = await _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Name = "Aceno alegre", Type = 7 });

        result.Name.Should().Be("Aceno alegre");
        result.Type.Should().Be(7);
    }

    [Fact]
    public async Task Update_ByAnotherUser_IsForbidden()
    {
        var act = () => _service.UpdateAsync(2, 10, new AnimationUpdateInfo { Name = "X", Type = 1 });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Update_RetypeWhileUsedInTheStateOfTheOldType_Conflicts()
    {
        _tokenRepository.Setup(r => r.AnyUsesClipAsync("animation:10", true, false, false)).ReturnsAsync(true);

        var act = () => _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Name = "Aceno", Type = 6 });

        await act.Should().ThrowAsync<ConflictException>().WithMessage(AnimationService.IN_USE);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Animation>()), Times.Never);
    }

    [Fact]
    public async Task Update_RenameOnlyWhileInUse_IsAllowed()
    {
        _tokenRepository.Setup(r => r.AnyUsesClipAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<bool>())).ReturnsAsync(true);

        var result = await _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Name = "Outro", Type = 1 });

        result.Name.Should().Be("Outro");
    }

    [Fact]
    public async Task Update_RetypeBetweenTypesWithoutState_ChecksNothing()
    {
        _repository.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(new Animation
        {
            AnimationId = 10, UserId = 1, Name = "Golpe", AnimationType = AnimationType.Attack, FileName = FILE
        });

        await _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Name = "Golpe", Type = 3 });

        _tokenRepository.Verify(r => r.AnyUsesClipAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task Update_AllFieldsAndContent_ChangesEverythingInOneCall()
    {
        const string NEW_FILE = "fedcba9876543210fedcba9876543210.json";
        _imageService.Setup(s => s.StoreAnimationAsync(It.IsAny<byte[]>())).ReturnsAsync(NEW_FILE);

        var result = await _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Name = "Ogro Parado", Type = 7, Content = VALID });

        result.Name.Should().Be("Ogro Parado");
        result.Type.Should().Be(7);
        result.Duration.Should().Be(1.2);
        result.Loop.Should().BeFalse();
        _repository.Verify(r => r.UpdateAsync(It.Is<Animation>(a => a.FileName == NEW_FILE && a.Name == "Ogro Parado")), Times.Once);
        _imageService.Verify(s => s.DeleteAnimationAsync(FILE), Times.Once);
    }

    [Fact]
    public async Task Update_OnlyContent_KeepsNameAndType()
    {
        var result = await _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Content = VALID });

        result.Name.Should().Be("Aceno");
        result.Type.Should().Be(1);
        result.Duration.Should().Be(1.2);
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Once);
    }

    [Fact]
    public async Task Update_OnlyName_KeepsTypeAndFile()
    {
        var result = await _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Name = "Aceno lento" });

        result.Name.Should().Be("Aceno lento");
        result.Type.Should().Be(1);
        result.Duration.Should().Be(1);
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Never);
        _imageService.Verify(s => s.DeleteAnimationAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task Update_NullJsonContent_KeepsTheFile()
    {
        var nothing = JsonDocument.Parse("null").RootElement;

        await _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Type = 1, Content = nothing });

        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Never);
    }

    [Fact]
    public async Task Update_InvalidContent_ChangesNothing()
    {
        var bad = JsonDocument.Parse("""{ "format": "roll6-animation", "version": 2 }""").RootElement;

        var act = () => _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Name = "Novo", Content = bad });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("content.version");
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Never);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Animation>()), Times.Never);
    }

    [Fact]
    public async Task Update_RetypeInUseWithContent_ConflictsBeforeStoring()
    {
        _tokenRepository.Setup(r => r.AnyUsesClipAsync("animation:10", true, false, false)).ReturnsAsync(true);

        var act = () => _service.UpdateAsync(1, 10, new AnimationUpdateInfo { Type = 6, Content = VALID });

        await act.Should().ThrowAsync<ConflictException>();
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Never);
    }

    [Fact]
    public async Task ReplaceContent_ByTheOwner_StoresTheNewFileAndRemovesTheOld()
    {
        const string NEW_FILE = "fedcba9876543210fedcba9876543210.json";
        _imageService.Setup(s => s.StoreAnimationAsync(It.IsAny<byte[]>())).ReturnsAsync(NEW_FILE);

        var result = await _service.ReplaceContentAsync(1, 10, new AnimationContentInfo { Content = VALID });

        result.AnimationId.Should().Be(10);
        result.Name.Should().Be("Aceno");
        result.Type.Should().Be(1);
        result.Duration.Should().Be(1.2);
        result.Loop.Should().BeFalse();
        _repository.Verify(r => r.UpdateAsync(It.Is<Animation>(a => a.FileName == NEW_FILE)), Times.Once);
        _imageService.Verify(s => s.DeleteAnimationAsync(FILE), Times.Once);
        _imageService.Verify(s => s.DeleteAnimationAsync(NEW_FILE), Times.Never);
    }

    [Fact]
    public async Task ReplaceContent_InvalidContent_StoresNothing()
    {
        var bad = JsonDocument.Parse("""{ "format": "roll6-animation", "version": 2 }""").RootElement;

        var act = () => _service.ReplaceContentAsync(1, 10, new AnimationContentInfo { Content = bad });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("content.version");
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Never);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Animation>()), Times.Never);
    }

    [Fact]
    public async Task ReplaceContent_ByAnotherUser_IsForbidden()
    {
        var act = () => _service.ReplaceContentAsync(2, 10, new AnimationContentInfo { Content = VALID });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _imageService.Verify(s => s.StoreAnimationAsync(It.IsAny<byte[]>()), Times.Never);
    }

    [Fact]
    public async Task ReplaceContent_FailedUpdate_KeepsTheOldFileAndRemovesTheNew()
    {
        const string NEW_FILE = "fedcba9876543210fedcba9876543210.json";
        _imageService.Setup(s => s.StoreAnimationAsync(It.IsAny<byte[]>())).ReturnsAsync(NEW_FILE);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Animation>())).ThrowsAsync(new Exception("db"));

        var act = () => _service.ReplaceContentAsync(1, 10, new AnimationContentInfo { Content = VALID });

        await act.Should().ThrowAsync<Exception>();
        _imageService.Verify(s => s.DeleteAnimationAsync(NEW_FILE), Times.Once);
        _imageService.Verify(s => s.DeleteAnimationAsync(FILE), Times.Never);
    }

    [Fact]
    public async Task Delete_WhileInUse_Conflicts()
    {
        _tokenRepository.Setup(r => r.AnyUsesClipAsync("animation:10", true, true, true)).ReturnsAsync(true);

        var act = () => _service.DeleteAsync(1, 10);

        await act.Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Delete_RemovesTheRowAndTheFile()
    {
        await _service.DeleteAsync(1, 10);

        _repository.Verify(r => r.DeleteAsync(10), Times.Once);
        _imageService.Verify(s => s.DeleteAnimationAsync(FILE), Times.Once);
    }

    [Fact]
    public async Task Delete_ByAnotherUser_IsForbidden()
    {
        var act = () => _service.DeleteAsync(2, 10);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }
}
