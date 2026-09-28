using Roll6.Domain.Enums;
using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Character;
using Roll6.DTO.Common;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class CharacterServiceTests
{
    private const long CHARACTER = 7;
    private const long OWNER = 3;
    private const long MASTER = 1;
    private const long OUTSIDER = 9;

    private readonly Mock<ITurnRepository<Turn>> _turnRepository = new();
    private readonly Mock<ICharacterRepository<Character>> _repository = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _campaignCharacterRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly CharacterService _service;

    public CharacterServiceTests()
    {
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string?>()))
            .Returns((string? file) => file == null ? null : $"https://cdn/{file}");
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _repository.Setup(r => r.UpdateAsync(It.IsAny<Character>())).ReturnsAsync((Character c) => c);
        _campaignCharacterRepository.Setup(r => r.ListCampaignIdsByCharacterAsync(It.IsAny<long>())).ReturnsAsync(new List<long>());
        _repository.Setup(r => r.GetByIdAsync(CHARACTER)).ReturnsAsync(() => new Character { CharacterId = CHARACTER, UserId = OWNER, Name = "Aria", Life = 12, Energy = 6 });
        _service = new CharacterService(_repository.Object, _campaignCharacterRepository.Object,
            _unitOfWork.Object, _userRepository.Object, _tokenRepository.Object, _mapTokenRepository.Object, _imageStorage.Object, _turnRepository.Object, _campaignRepository.Object, _notifier.Object);
    }

    [Fact]
    public async Task Search_ReturnsPublicFieldsWithOwnerNames()
    {
        _repository.Setup(r => r.ListPagedAsync("ar", 20, 10)).ReturnsAsync((new List<Character>
        {
            new() { CharacterId = 1, UserId = 5, Name = "Aria", Image = "0123456789abcdef0123456789abcdef.png" },
            new() { CharacterId = 2, UserId = 6, Name = "Arthur" },
            new() { CharacterId = 3, UserId = 5, Name = "Barao" }
        }, 23));
        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<User>
        {
            new() { UserId = 5, Name = "Rodrigo" },
            new() { UserId = 6, Name = "Ana" }
        });

        var result = await _service.SearchAsync(new PageQuery { Page = 3, PageSize = 10, Search = "ar" });

        result.TotalCount.Should().Be(23);
        result.Page.Should().Be(3);
        result.Items.Should().HaveCount(3);
        result.Items[0].OwnerName.Should().Be("Rodrigo");
        result.Items[0].ImageUrl.Should().Be("https://cdn/0123456789abcdef0123456789abcdef.png");
        result.Items[1].OwnerName.Should().Be("Ana");
        result.Items[1].ImageUrl.Should().BeNull();
        _userRepository.Verify(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()), Times.Once);
    }

    [Fact]
    public async Task Search_Empty_DoesNotLoadOwners()
    {
        _repository.Setup(r => r.ListPagedAsync(null, 0, 20)).ReturnsAsync((new List<Character>(), 0));

        var result = await _service.SearchAsync(new PageQuery());

        result.Items.Should().BeEmpty();
        _userRepository.Verify(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>()), Times.Never);
    }

    private static CharacterInsertInfo Changes(int life = 10, int energy = 4) =>
        new() { Name = "Aria", Life = life, Energy = energy, Move = 6 };

    [Fact]
    public async Task GetAndUpdate_Owner_Allowed()
    {
        (await _service.GetByIdAsync(OWNER, CHARACTER)).Name.Should().Be("Aria");

        var updated = await _service.UpdateAsync(OWNER, CHARACTER, Changes());

        updated.Life.Should().Be(10);
    }

    /// <summary>The master changes only the participation, never the character itself (010 FR-006).</summary>
    [Theory]
    [InlineData(MASTER)]
    [InlineData(OUTSIDER)]
    public async Task GetAndUpdate_NotOwner_Throws(long userId)
    {
        await _service.Invoking(s => s.GetByIdAsync(userId, CHARACTER)).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.UpdateAsync(userId, CHARACTER, Changes())).Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Character>()), Times.Never);
    }

    [Fact]
    public async Task Delete_Master_Throws()
    {
        await _service.Invoking(s => s.DeleteAsync(MASTER, CHARACTER)).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Update_ClampsCurrentValuesToTheNewTotals()
    {
        await _service.UpdateAsync(OWNER, CHARACTER, Changes(life: 8, energy: 2));

        _campaignCharacterRepository.Verify(r => r.ClampVitalsAsync(CHARACTER, 8, 2), Times.Once);
    }

    [Fact]
    public async Task Update_WithUnknownToken_Throws()
    {
        var info = Changes();
        info.TokenId = 99;

        await _service.Invoking(s => s.UpdateAsync(OWNER, CHARACTER, info)).Should().ThrowAsync<KeyNotFoundException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<Character>()), Times.Never);
    }

    [Fact]
    public async Task Update_WithToken_ReturnsItsNameAndImage()
    {
        _tokenRepository.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new Token { TokenId = 5, Name = "Guerreira", UpImage = "0123456789abcdef0123456789abcdef.png" });
        var info = Changes();
        info.TokenId = 5;

        var result = await _service.UpdateAsync(OWNER, CHARACTER, info);

        result.TokenId.Should().Be(5);
        result.TokenName.Should().Be("Guerreira");
        result.TokenImageUrl.Should().Be("https://cdn/0123456789abcdef0123456789abcdef.png");
    }

    [Fact]
    public async Task Delete_Owner_RemovesItsMapPiecesFirst()
    {
        await _service.DeleteAsync(OWNER, CHARACTER);

        _mapTokenRepository.Verify(r => r.DeleteByCharacterAsync(CHARACTER), Times.Once);
        _campaignCharacterRepository.Verify(r => r.DeleteByCharacterAsync(CHARACTER), Times.Once);
        _repository.Verify(r => r.DeleteAsync(CHARACTER), Times.Once);
    }

    [Fact]
    public async Task Update_PublishesToEveryCampaignOfTheCharacter()
    {
        _campaignCharacterRepository.Setup(r => r.ListCampaignIdsByCharacterAsync(CHARACTER)).ReturnsAsync(new List<long> { 10, 11 });

        await _service.UpdateAsync(OWNER, CHARACTER, Changes());

        foreach (var campaignId in new long[] { 10, 11 })
        {
            _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.PARTY_CHANGED && e.CampaignId == campaignId)), Times.Once);
            _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKENS_CHANGED && e.CampaignId == campaignId)), Times.Once);
        }
    }

    // ---- 021: transfer ----

    private const long RECEIVER = 4;

    private void GivenReceiver(string email = "b@x.com") =>
        _userRepository.Setup(r => r.GetByEmailAsync(email)).ReturnsAsync(new User { UserId = RECEIVER, Email = email });

    [Fact]
    public async Task Transfer_Owner_MovesTheCharacterToTheNormalizedEmailUser()
    {
        GivenReceiver();
        _repository.Setup(r => r.TransferAsync(CHARACTER, OWNER, RECEIVER)).ReturnsAsync(true);

        await _service.TransferAsync(OWNER, CHARACTER, new CharacterTransferInfo { Email = "  B@X.COM " });

        _repository.Verify(r => r.TransferAsync(CHARACTER, OWNER, RECEIVER), Times.Once);
    }

    [Fact]
    public async Task Transfer_UnknownCharacter_NotFound()
    {
        var act = () => _service.TransferAsync(OWNER, 99, new CharacterTransferInfo { Email = "b@x.com" });

        await act.Should().ThrowAsync<KeyNotFoundException>();
        _repository.Verify(r => r.TransferAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Transfer_NotOwner_Forbidden()
    {
        GivenReceiver();

        var act = () => _service.TransferAsync(OUTSIDER, CHARACTER, new CharacterTransferInfo { Email = "b@x.com" });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.TransferAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<long>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-an-email")]
    public async Task Transfer_InvalidEmail_ValidationError(string email)
    {
        var act = () => _service.TransferAsync(OWNER, CHARACTER, new CharacterTransferInfo { Email = email });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("email");
        _repository.Verify(r => r.TransferAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Transfer_UnknownEmail_UserNotFound()
    {
        var act = () => _service.TransferAsync(OWNER, CHARACTER, new CharacterTransferInfo { Email = "nobody@x.com" });

        await act.Should().ThrowAsync<KeyNotFoundException>().WithMessage("Usuário não encontrado.");
        _repository.Verify(r => r.TransferAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Transfer_ToTheOwner_ValidationError()
    {
        _userRepository.Setup(r => r.GetByEmailAsync("a@x.com")).ReturnsAsync(new User { UserId = OWNER, Email = "a@x.com" });

        var act = () => _service.TransferAsync(OWNER, CHARACTER, new CharacterTransferInfo { Email = "a@x.com" });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Should().ContainKey("email");
        _repository.Verify(r => r.TransferAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Transfer_OwnerChangedMeanwhile_ConflictAndNoEvents()
    {
        GivenReceiver();
        _campaignCharacterRepository.Setup(r => r.ListCampaignIdsByCharacterAsync(CHARACTER)).ReturnsAsync(new List<long> { 20 });
        _repository.Setup(r => r.TransferAsync(CHARACTER, OWNER, RECEIVER)).ReturnsAsync(false);

        var act = () => _service.TransferAsync(OWNER, CHARACTER, new CharacterTransferInfo { Email = "b@x.com" });

        await act.Should().ThrowAsync<ConflictException>();
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
        _notifier.Verify(n => n.RemoveUserFromCampaignAsync(It.IsAny<long>(), It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Transfer_PublishesToEveryCampaignAndDropsTheFormerOwnerWhereHeLostAccess()
    {
        GivenReceiver();
        _repository.Setup(r => r.TransferAsync(CHARACTER, OWNER, RECEIVER)).ReturnsAsync(true);
        _campaignCharacterRepository.Setup(r => r.ListCampaignIdsByCharacterAsync(CHARACTER)).ReturnsAsync(new List<long> { 20, 21, 22 });
        _campaignRepository.Setup(r => r.GetByIdAsync(20)).ReturnsAsync(new Campaign { CampaignId = 20, UserId = MASTER });
        _campaignRepository.Setup(r => r.GetByIdAsync(21)).ReturnsAsync(new Campaign { CampaignId = 21, UserId = MASTER });
        _campaignRepository.Setup(r => r.GetByIdAsync(22)).ReturnsAsync(new Campaign { CampaignId = 22, UserId = OWNER });
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(20, OWNER)).ReturnsAsync(false);
        _campaignCharacterRepository.Setup(r => r.HasApprovedCharacterAsync(21, OWNER)).ReturnsAsync(true);

        await _service.TransferAsync(OWNER, CHARACTER, new CharacterTransferInfo { Email = "b@x.com" });

        foreach (var campaignId in new long[] { 20, 21, 22 })
        {
            _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.PARTY_CHANGED && e.CampaignId == campaignId)), Times.Once);
            _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKENS_CHANGED && e.CampaignId == campaignId)), Times.Once);
        }
        // 20: player without another approved character; 21: still has one; 22: he is the master.
        _notifier.Verify(n => n.RemoveUserFromCampaignAsync(OWNER, 20), Times.Once);
        _notifier.Verify(n => n.RemoveUserFromCampaignAsync(OWNER, It.IsIn(21L, 22L)), Times.Never);
    }

    // ---- 022: sheet file ----

    [Fact]
    public async Task CreateAndUpdate_KeepTheSheetFileAndReturnItsUrlAndType()
    {
        _repository.Setup(r => r.InsertAsync(It.IsAny<Character>())).ReturnsAsync((Character c) => c);
        const string pdf = "0123456789abcdef0123456789abcdef.pdf";

        var created = await _service.CreateAsync(OWNER, new CharacterInsertInfo { Name = "Aria", Life = 1, Energy = 1, Move = 1, SheetFile = pdf });

        created.SheetFile.Should().Be(pdf);
        created.SheetFileUrl.Should().Be("https://cdn/" + pdf);
        created.SheetFileType.Should().Be("pdf");

        const string png = "0123456789abcdef0123456789abcdef.png";
        var updated = await _service.UpdateAsync(OWNER, CHARACTER, new CharacterInsertInfo { Name = "Aria", Life = 1, Energy = 1, Move = 1, SheetFile = png });
        updated.SheetFileType.Should().Be("image");
        _repository.Verify(r => r.UpdateAsync(It.Is<Character>(c => c.SheetFile == png)), Times.Once);

        var removed = await _service.UpdateAsync(OWNER, CHARACTER, new CharacterInsertInfo { Name = "Aria", Life = 1, Energy = 1, Move = 1 });
        removed.SheetFile.Should().BeNull();
        removed.SheetFileUrl.Should().BeNull();
        removed.SheetFileType.Should().BeNull();
    }

    // ---- 024: the owner's changes to the character itself ----

    [Fact]
    public async Task Update_TotalsChanged_RecordsInEveryApprovedCampaign()
    {
        _campaignCharacterRepository.Setup(r => r.ListCampaignIdsByCharacterAsync(CHARACTER)).ReturnsAsync(new List<long> { 20, 21, 22 });
        _campaignCharacterRepository.Setup(r => r.GetAsync(20, CHARACTER)).ReturnsAsync(new CampaignCharacter { CampaignId = 20, CharacterId = CHARACTER, Status = CampaignCharacterStatus.Approved });
        _campaignCharacterRepository.Setup(r => r.GetAsync(21, CHARACTER)).ReturnsAsync(new CampaignCharacter { CampaignId = 21, CharacterId = CHARACTER, Status = CampaignCharacterStatus.Invited });
        _campaignCharacterRepository.Setup(r => r.GetAsync(22, CHARACTER)).ReturnsAsync(new CampaignCharacter { CampaignId = 22, CharacterId = CHARACTER, Status = CampaignCharacterStatus.Approved });
        _campaignRepository.Setup(r => r.GetByIdAsync(20)).ReturnsAsync(new Campaign { CampaignId = 20, UserId = MASTER, CurrentTurn = 5, CurrentMapId = 300 });
        _campaignRepository.Setup(r => r.GetByIdAsync(22)).ReturnsAsync(new Campaign { CampaignId = 22, UserId = MASTER, CurrentTurn = 1 });
        var recorded = new List<Turn>();
        _turnRepository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).Callback((Turn t) => recorded.Add(t)).ReturnsAsync((Turn t) => t);

        await _service.UpdateAsync(OWNER, CHARACTER, new CharacterInsertInfo { Name = "Aria", Life = 10, Energy = 6, Move = 1 });

        recorded.Select(t => (t.CampaignId, t.TurnNo, t.MapId, t.UserId)).Should().Equal((20L, 5, (long?)300, OWNER), (22L, 1, (long?)null, OWNER));
        recorded[0].Changes!.Select(c => (c.Field, c.Before, c.After)).Should().Equal(("life", "12", "10"), ("move", "0", "1"));
    }

    [Fact]
    public async Task Update_OnlyPictureOrSheet_RecordsNothing()
    {
        _campaignCharacterRepository.Setup(r => r.ListCampaignIdsByCharacterAsync(CHARACTER)).ReturnsAsync(new List<long> { 20 });

        await _service.UpdateAsync(OWNER, CHARACTER, new CharacterInsertInfo { Name = "Aria", Life = 12, Energy = 6, Sheet = "Nova ficha" });

        _turnRepository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }
}
