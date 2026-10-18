using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.Domain.Weapons;
using Roll6.DTO.Realtime;
using Roll6.DTO.Token;
using Roll6.DTO.Weapon;
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
    private readonly Mock<IAnimationRepository<Animation>> _animationRepository = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<IWeaponRepository<Weapon>> _weaponRepository = new();
    private readonly Mock<ITokenWeaponRepository<TokenWeapon>> _tokenWeaponRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly TokenLibraryService _service;

    public TokenLibraryServiceTests()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);
        _repository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, UserId = 1, Name = "Goblin" });
        _mapTokenRepository.Setup(r => r.ListCampaignIdsByTokenAsync(It.IsAny<long>())).ReturnsAsync(new List<long>());
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string>())).Returns((string? name) => name == null ? null : "https://x/" + name);
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _tokenWeaponRepository.Setup(r => r.ListByTokenIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<TokenWeapon>());
        _service = new TokenLibraryService(_repository.Object, _mapTokenRepository.Object, _characterRepository.Object, _npcRepository.Object, _imageStorage.Object,
            _animationRepository.Object, _tokenWeaponRepository.Object, _unitOfWork.Object, _weaponRepository.Object, _notifier.Object);
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

    // ---- 055: 3D model ----

    private const string MODEL_FILE = "0123456789abcdef0123456789abcdef.glb";

    [Fact]
    public async Task Create_WithModel_KeepsItAndItsUrl()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Orc", ModelFile = MODEL_FILE });

        result.ModelFile.Should().Be(MODEL_FILE);
        result.ModelFileUrl.Should().Be("https://x/" + MODEL_FILE);
    }

    [Fact]
    public async Task Create_WithoutModel_HasNone()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Orc" });

        result.ModelFile.Should().BeNull();
        result.ModelFileUrl.Should().BeNull();
    }

    [Fact]
    public async Task Create_WithInvalidModel_Throws()
    {
        var act = () => _service.CreateAsync(1, new TokenInsertInfo { Name = "Orc", ModelFile = "orc.fbx" });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("modelFile");
    }

    [Fact]
    public async Task Update_WithoutModel_RemovesIt()
    {
        _repository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Token { TokenId = 7, UserId = 1, Name = "Orc", ModelFile = MODEL_FILE });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        var result = await _service.UpdateAsync(1, 7, new TokenInsertInfo { Name = "Orc" });

        result.ModelFile.Should().BeNull();
    }

    [Fact]
    public async Task Update_SendingTheModelBack_KeepsIt()
    {
        _repository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Token { TokenId = 7, UserId = 1, Name = "Orc", ModelFile = MODEL_FILE });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        var result = await _service.UpdateAsync(1, 7, new TokenInsertInfo { Name = "Orc 2", ModelFile = MODEL_FILE });

        result.ModelFile.Should().Be(MODEL_FILE);
        result.Name.Should().Be("Orc 2");
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

    private void GivenAnimations(params Animation[] animations) =>
        _animationRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync((IEnumerable<long> ids) => animations.Where(a => ids.Contains(a.AnimationId)).ToList());

    [Fact]
    public async Task Create_WithLibraryAnimationsOfTheStatesTypes_KeepsThem()
    {
        GivenAnimations(
            new Animation { AnimationId = 7, AnimationType = AnimationType.Idle },
            new Animation { AnimationId = 8, AnimationType = AnimationType.Walk },
            new Animation { AnimationId = 9, AnimationType = AnimationType.Defeated });

        var result = await _service.CreateAsync(1, new TokenInsertInfo
        {
            Name = "Orc", ModelFile = MODEL_FILE,
            ModelIdleClip = "animation:7", ModelWalkClip = "animation:8", ModelDownClip = "animation:9"
        });

        result.ModelIdleClip.Should().Be("animation:7");
        result.ModelWalkClip.Should().Be("animation:8");
        result.ModelDownClip.Should().Be("animation:9");
    }

    [Fact]
    public async Task Create_WithALibraryAnimationOfAnotherType_ThrowsOnThatState()
    {
        GivenAnimations(new Animation { AnimationId = 7, AnimationType = AnimationType.Attack });

        var act = () => _service.CreateAsync(1, new TokenInsertInfo { Name = "Orc", ModelFile = MODEL_FILE, ModelIdleClip = "animation:7" });

        (await act.Should().ThrowAsync<DomainValidationException>())
            .Which.Errors["modelIdleClip"].Single().Should().Contain("Atacando").And.Contain("Parado");
        _repository.Verify(r => r.InsertAsync(It.IsAny<Token>()), Times.Never);
    }

    [Fact]
    public async Task Update_WithAMissingLibraryAnimation_ThrowsOnThatState()
    {
        GivenAnimations();

        var act = () => _service.UpdateAsync(1, 5, new TokenInsertInfo { Name = "Orc", ModelFile = MODEL_FILE, ModelDownClip = "animation:99" });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("modelDownClip");
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Token>()), Times.Never);
    }

    [Fact]
    public async Task Create_WithoutAModel_DropsLibraryChoicesWithoutReadingThem()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Orc", ModelIdleClip = "animation:7" });

        result.ModelIdleClip.Should().BeNull();
        _animationRepository.Verify(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()), Times.Never);
    }

    [Fact]
    public async Task Create_SavesTheModelSize()
    {
        var result = await _service.CreateAsync(1, new TokenInsertInfo { Name = "Ogro", ModelFile = MODEL_FILE, ModelScale = 150 });

        result.ModelScale.Should().Be(150);
    }

    [Fact]
    public async Task Create_InvalidModelSize_IsRefused()
    {
        var act = () => _service.CreateAsync(1, new TokenInsertInfo { Name = "Ogro", ModelFile = MODEL_FILE, ModelScale = 42 });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("modelScale");
        _repository.Verify(r => r.InsertAsync(It.IsAny<Token>()), Times.Never);
    }

    [Fact]
    public async Task Update_ChangesTheModelSize_AndRemovingTheModelResetsIt()
    {
        _repository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Token { TokenId = 7, UserId = 1, Name = "Orc", ModelFile = MODEL_FILE, ModelScale = 150 });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        (await _service.UpdateAsync(1, 7, new TokenInsertInfo { Name = "Orc", ModelFile = MODEL_FILE, ModelScale = 200 })).ModelScale.Should().Be(200);
        (await _service.UpdateAsync(1, 7, new TokenInsertInfo { Name = "Orc", ModelScale = 200 })).ModelScale.Should().Be(100);
    }

    [Fact]
    public async Task Update_TellsEachCampaignWithAPieceOfTheToken()
    {
        _repository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Token { TokenId = 7, UserId = 1, Name = "Orc", ModelFile = MODEL_FILE });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);
        _mapTokenRepository.Setup(r => r.ListCampaignIdsByTokenAsync(7)).ReturnsAsync(new List<long> { 3, 9 });

        await _service.UpdateAsync(1, 7, new TokenInsertInfo { Name = "Orc", ModelFile = MODEL_FILE, ModelScale = 120 });

        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e =>
            e.Type == TableEventType.MAP_TOKENS_CHANGED && e.MapId == null && e.ActorUserId == 1 && (e.CampaignId == 3 || e.CampaignId == 9))), Times.Exactly(2));
    }

    [Fact]
    public async Task Create_TellsNoCampaign()
    {
        await _service.CreateAsync(1, new TokenInsertInfo { Name = "Ogro" });

        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task Update_Refused_TellsNoCampaign()
    {
        var act = () => _service.UpdateAsync(2, 5, new TokenInsertInfo { Name = "Goblin" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    private const string MODEL = "0123456789abcdef0123456789abcdef.glb";
    private const string SWORD_FILE = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.glb";

    private void WithWeapons(params long[] ids) =>
        _weaponRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()))
            .ReturnsAsync((IEnumerable<long> wanted) => ids.Where(wanted.Contains)
                .Select(id => new Weapon { WeaponId = id, UserId = 2, Name = $"Arma {id}", ModelFile = SWORD_FILE, GripY = 0.1, PoseRz = 270 }).ToList());

    /// <summary>The rows the service replaces are what the next read returns, like the database would.</summary>
    private List<TokenWeapon> CaptureReplacedRows()
    {
        var rows = new List<TokenWeapon>();
        _tokenWeaponRepository.Setup(r => r.ReplaceAsync(It.IsAny<long>(), It.IsAny<IEnumerable<TokenWeapon>>()))
            .Callback((long _, IEnumerable<TokenWeapon> items) => { rows.Clear(); rows.AddRange(items); })
            .Returns(Task.CompletedTask);
        _tokenWeaponRepository.Setup(r => r.ListByTokenIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(() => rows.ToList());
        return rows;
    }

    [Fact]
    public async Task Create_WithWeaponsInSockets_SavesTheRowsAndReadsThemBySocket()
    {
        WithWeapons(7, 8);
        var rows = CaptureReplacedRows();
        _repository.Setup(r => r.InsertAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => { t.TokenId = 9; return t; });

        var result = await _service.CreateAsync(1, new TokenInsertInfo
        {
            Name = "Guerreiro",
            ModelFile = MODEL,
            Weapons = new List<TokenWeaponInfo>
            {
                new() { Socket = 3, WeaponId = 8 },
                new() { Socket = 1, WeaponId = 7, Grip = new WeaponGripInfo { Rz = 90, Scale = 120 } }
            }
        });

        rows.Select(row => (row.TokenId, row.Socket, row.WeaponId)).Should().Equal((9, WeaponSocket.RightHand, 7), (9, WeaponSocket.Back, 8));
        result.Weapons.Select(w => w.Socket).Should().Equal(1, 3);
        result.Weapons[0].Name.Should().Be("Arma 7");
        result.Weapons[0].ModelFileUrl.Should().Be("https://x/" + SWORD_FILE);
        result.Weapons[0].GripPoint!.Y.Should().Be(0.1);
        result.Weapons[0].Pose!.Rz.Should().Be(270);
        result.Weapons[0].Grip!.Rz.Should().Be(90);
        result.Weapons[0].Grip.Scale.Should().Be(120);
        result.Weapons[1].Grip!.Scale.Should().Be(100);
    }

    [Fact]
    public async Task Create_SameWeaponInTwoSockets_IsAccepted()
    {
        WithWeapons(7);
        CaptureReplacedRows();

        var result = await _service.CreateAsync(1, new TokenInsertInfo
        {
            Name = "Duas adagas",
            ModelFile = MODEL,
            Weapons = new List<TokenWeaponInfo> { new() { Socket = 1, WeaponId = 7 }, new() { Socket = 2, WeaponId = 7 } }
        });

        result.Weapons.Select(w => w.WeaponId).Should().Equal(7, 7);
    }

    [Fact]
    public async Task Create_UnknownWeapon_IsRefusedKeyedByIndex()
    {
        WithWeapons(7);

        var act = () => _service.CreateAsync(1, new TokenInsertInfo
        {
            Name = "Guerreiro",
            ModelFile = MODEL,
            Weapons = new List<TokenWeaponInfo> { new() { Socket = 1, WeaponId = 7 }, new() { Socket = 2, WeaponId = 99 } }
        });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("weapons[1].weaponId");
        _repository.Verify(r => r.InsertAsync(It.IsAny<Token>()), Times.Never);
    }

    [Fact]
    public async Task Create_RepeatedSocket_IsRefused()
    {
        WithWeapons(7);

        var act = () => _service.CreateAsync(1, new TokenInsertInfo
        {
            Name = "Guerreiro",
            ModelFile = MODEL,
            Weapons = new List<TokenWeaponInfo> { new() { Socket = 1, WeaponId = 7 }, new() { Socket = 1, WeaponId = 7 } }
        });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("weapons[1].socket");
    }

    [Fact]
    public async Task Create_GripOutOfRange_IsRefused()
    {
        WithWeapons(7);

        var act = () => _service.CreateAsync(1, new TokenInsertInfo
        {
            Name = "Guerreiro",
            ModelFile = MODEL,
            Weapons = new List<TokenWeaponInfo> { new() { Socket = 1, WeaponId = 7, Grip = new WeaponGripInfo { X = 3 } } }
        });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("weapons[0].grip.x");
    }

    [Fact]
    public async Task Create_WithoutModel_DropsTheWeapons()
    {
        WithWeapons(7);

        var result = await _service.CreateAsync(1, new TokenInsertInfo
        {
            Name = "Baú",
            Weapons = new List<TokenWeaponInfo> { new() { Socket = 1, WeaponId = 7 } }
        });

        result.Weapons.Should().BeEmpty();
        _weaponRepository.Verify(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()), Times.Never);
        _tokenWeaponRepository.Verify(r => r.ReplaceAsync(It.IsAny<long>(), It.IsAny<IEnumerable<TokenWeapon>>()), Times.Never);
    }

    [Fact]
    public async Task Update_ReplacesTheWholeSet()
    {
        WithWeapons(7, 8);
        var rows = CaptureReplacedRows();
        rows.Add(TokenWeapon.Create(9, WeaponSocket.RightHand, 7, null));
        rows.Add(TokenWeapon.Create(9, WeaponSocket.LeftHand, 8, null));
        _repository.Setup(r => r.GetByIdAsync(9)).ReturnsAsync(new Token { TokenId = 9, UserId = 1, Name = "Guerreiro", ModelFile = MODEL });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        var result = await _service.UpdateAsync(1, 9, new TokenInsertInfo
        {
            Name = "Guerreiro", ModelFile = MODEL, Weapons = new List<TokenWeaponInfo> { new() { Socket = 4, WeaponId = 7 } }
        });

        result.Weapons.Select(w => w.Socket).Should().Equal(4);
        _tokenWeaponRepository.Verify(r => r.ReplaceAsync(9, It.Is<IEnumerable<TokenWeapon>>(items => items.Count() == 1)), Times.Once);
    }

    [Fact]
    public async Task Update_WithoutWeapons_EmptiesEverySocket()
    {
        WithWeapons(7);
        CaptureReplacedRows();
        _repository.Setup(r => r.GetByIdAsync(9)).ReturnsAsync(new Token { TokenId = 9, UserId = 1, Name = "Guerreiro", ModelFile = MODEL });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Token>())).ReturnsAsync((Token t) => t);

        var result = await _service.UpdateAsync(1, 9, new TokenInsertInfo { Name = "Guerreiro", ModelFile = MODEL });

        result.Weapons.Should().BeEmpty();
        _tokenWeaponRepository.Verify(r => r.ReplaceAsync(9, It.Is<IEnumerable<TokenWeapon>>(items => !items.Any())), Times.Once);
    }

    [Fact]
    public async Task Delete_RemovesTheWeaponRowsFirst()
    {
        var order = new List<string>();
        _tokenWeaponRepository.Setup(r => r.DeleteByTokenAsync(5)).Callback(() => order.Add("rows")).Returns(Task.CompletedTask);
        _repository.Setup(r => r.DeleteAsync(5)).Callback(() => order.Add("token")).Returns(Task.CompletedTask);

        await _service.DeleteAsync(1, 5);

        order.Should().Equal("rows", "token");
    }
}
