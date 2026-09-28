using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.CampaignCharacter;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class CampaignCharacterServiceTests
{
    private const long MASTER_ID = 1;
    private const long PLAYER_ID = 2;
    private const long OUTSIDER_ID = 3;
    private const long OPEN_CAMPAIGN = 10;
    private const long CLOSED_CAMPAIGN = 11;
    private const long CHARACTER = 20;

    private readonly Mock<ICampaignCharacterRepository<CampaignCharacter>> _repository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<ICharacterRepository<Character>> _characterRepository = new();
    private readonly Mock<IUserRepository<User>> _userRepository = new();
    private readonly Mock<IMapTokenRepository<MapToken>> _mapTokenRepository = new();
    private readonly Mock<ITokenRepository<Token>> _tokenRepository = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IRealtimeNotifier> _notifier = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
    private readonly CampaignCharacterService _service;

    public CampaignCharacterServiceTests()
    {
        var campaigns = new List<Campaign>
        {
            new() { CampaignId = OPEN_CAMPAIGN, UserId = MASTER_ID, Name = "Aberta", Open = true },
            new() { CampaignId = CLOSED_CAMPAIGN, UserId = MASTER_ID, Name = "Fechada", Open = false }
        };
        foreach (var campaign in campaigns)
            _campaignRepository.Setup(r => r.GetByIdAsync(campaign.CampaignId)).ReturnsAsync(campaign);
        _campaignRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(campaigns);

        var character = new Character { CharacterId = CHARACTER, UserId = PLAYER_ID, Name = "Thorin", Life = 12, Energy = 6, Move = 5, Sheet = "Força 3" };
        _characterRepository.Setup(r => r.GetByIdAsync(CHARACTER)).ReturnsAsync(character);
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character> { character });

        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<User>
        {
            new() { UserId = MASTER_ID, Name = "Mestre Ana" },
            new() { UserId = PLAYER_ID, Name = "Bruno" }
        });
        _repository.Setup(r => r.InsertAsync(It.IsAny<CampaignCharacter>())).ReturnsAsync((CampaignCharacter c) => c);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<CampaignCharacter>())).ReturnsAsync((CampaignCharacter c) => c);
        _unitOfWork.Setup(u => u.ExecuteInTransactionAsync(It.IsAny<Func<Task>>())).Returns((Func<Task> action) => action());
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string?>())).Returns((string? file) => file == null ? null : $"https://cdn/{file}");

        _service = new CampaignCharacterService(_repository.Object, _campaignRepository.Object,
            _characterRepository.Object, _userRepository.Object, _mapTokenRepository.Object, _tokenRepository.Object, _unitOfWork.Object,
            _imageStorage.Object, _notifier.Object);
    }

    private static CampaignCharacterRequestInfo Request(long campaignId) => new() { CampaignId = campaignId, CharacterId = CHARACTER };

    private void SetupParticipation(long id, long campaignId, CampaignCharacterStatus status) =>
        _repository.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(new CampaignCharacter
        {
            CampaignCharacterId = id, CampaignId = campaignId, CharacterId = CHARACTER, Status = status
        });

    [Fact]
    public async Task RequestAccess_OpenCampaign_IsApprovedWithNames()
    {
        var result = await _service.RequestAccessAsync(PLAYER_ID, Request(OPEN_CAMPAIGN));

        result.Status.Should().Be((int)CampaignCharacterStatus.Approved);
        result.CampaignOwnerName.Should().Be("Mestre Ana");
        result.CharacterOwnerName.Should().Be("Bruno");
        result.CharacterName.Should().Be("Thorin");
    }

    [Fact]
    public async Task RequestAccess_ClosedCampaign_IsPending()
    {
        var result = await _service.RequestAccessAsync(PLAYER_ID, Request(CLOSED_CAMPAIGN));

        result.Status.Should().Be((int)CampaignCharacterStatus.RequestedAccess);
    }

    [Fact]
    public async Task RequestAccess_WithSomeoneElsesCharacter_Throws()
    {
        var act = () => _service.RequestAccessAsync(OUTSIDER_ID, Request(OPEN_CAMPAIGN));

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task RequestAccess_AlreadyApproved_Throws()
    {
        _repository.Setup(r => r.GetAsync(OPEN_CAMPAIGN, CHARACTER)).ReturnsAsync(new CampaignCharacter { Status = CampaignCharacterStatus.Approved });

        var act = () => _service.RequestAccessAsync(PLAYER_ID, Request(OPEN_CAMPAIGN));

        await act.Should().ThrowAsync<ConflictException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<CampaignCharacter>()), Times.Never);
    }

    [Fact]
    public async Task ApproveRequest_ByMaster_Approves()
    {
        SetupParticipation(50, CLOSED_CAMPAIGN, CampaignCharacterStatus.RequestedAccess);

        var result = await _service.ApproveRequestAsync(MASTER_ID, 50);

        result.Status.Should().Be((int)CampaignCharacterStatus.Approved);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e =>
            e.Type == TableEventType.PARTY_CHANGED && e.CampaignId == CLOSED_CAMPAIGN && e.ActorUserId == MASTER_ID)), Times.Once);
    }

    [Fact]
    public async Task DenyRequest_ByPlayer_Throws()
    {
        SetupParticipation(50, CLOSED_CAMPAIGN, CampaignCharacterStatus.RequestedAccess);

        var act = () => _service.DenyRequestAsync(PLAYER_ID, 50);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _notifier.Verify(n => n.PublishAsync(It.IsAny<TableEventInfo>()), Times.Never);
    }

    [Fact]
    public async Task Invite_NewCharacter_IsInvited()
    {
        var result = await _service.InviteAsync(MASTER_ID, Request(CLOSED_CAMPAIGN));

        result.Status.Should().Be((int)CampaignCharacterStatus.Invited);
    }

    [Fact]
    public async Task Invite_OverPendingRequest_Approves()
    {
        _repository.Setup(r => r.GetAsync(CLOSED_CAMPAIGN, CHARACTER))
            .ReturnsAsync(new CampaignCharacter { CampaignId = CLOSED_CAMPAIGN, CharacterId = CHARACTER, Status = CampaignCharacterStatus.RequestedAccess });

        var result = await _service.InviteAsync(MASTER_ID, Request(CLOSED_CAMPAIGN));

        result.Status.Should().Be((int)CampaignCharacterStatus.Approved);
    }

    [Fact]
    public async Task Invite_ByNonMaster_Throws()
    {
        var act = () => _service.InviteAsync(PLAYER_ID, Request(CLOSED_CAMPAIGN));

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task AcceptInvite_ByCharacterOwner_Approves()
    {
        SetupParticipation(51, CLOSED_CAMPAIGN, CampaignCharacterStatus.Invited);

        var result = await _service.AcceptInviteAsync(PLAYER_ID, 51);

        result.Status.Should().Be((int)CampaignCharacterStatus.Approved);
    }

    [Fact]
    public async Task DeclineInvite_ByMaster_Throws()
    {
        SetupParticipation(51, CLOSED_CAMPAIGN, CampaignCharacterStatus.Invited);

        var act = () => _service.DeclineInviteAsync(MASTER_ID, 51);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task ListByCampaign_Master_SeesAll()
    {
        _repository.Setup(r => r.ListByCampaignAsync(CLOSED_CAMPAIGN, false)).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignId = CLOSED_CAMPAIGN, CharacterId = CHARACTER, Status = CampaignCharacterStatus.RequestedAccess }
        });

        var result = await _service.ListByCampaignAsync(MASTER_ID, CLOSED_CAMPAIGN);

        result.Should().ContainSingle();
    }

    [Fact]
    public async Task ListByCampaign_ApprovedPlayer_SeesOnlyApproved()
    {
        _repository.Setup(r => r.HasApprovedCharacterAsync(CLOSED_CAMPAIGN, PLAYER_ID)).ReturnsAsync(true);
        _repository.Setup(r => r.ListByCampaignAsync(CLOSED_CAMPAIGN, true)).ReturnsAsync(new List<CampaignCharacter>());

        await _service.ListByCampaignAsync(PLAYER_ID, CLOSED_CAMPAIGN);

        _repository.Verify(r => r.ListByCampaignAsync(CLOSED_CAMPAIGN, true));
        _repository.Verify(r => r.ListByCampaignAsync(CLOSED_CAMPAIGN, false), Times.Never);
    }

    [Fact]
    public async Task ListByCampaign_Outsider_Throws()
    {
        var act = () => _service.ListByCampaignAsync(OUTSIDER_ID, CLOSED_CAMPAIGN);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task ListInvites_ReturnsUserInvitesWithCampaignNames()
    {
        _repository.Setup(r => r.ListInvitesByUserAsync(PLAYER_ID)).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = 52, CampaignId = CLOSED_CAMPAIGN, CharacterId = CHARACTER, Status = CampaignCharacterStatus.Invited }
        });

        var result = await _service.ListInvitesAsync(PLAYER_ID);

        result.Should().ContainSingle(i => i.CampaignName == "Fechada" && i.CampaignOwnerName == "Mestre Ana");
    }

    [Fact]
    public async Task RequestAccess_MasterOwnCharacter_ClosedCampaign_IsApproved()
    {
        var own = new Character { CharacterId = 21, UserId = MASTER_ID, Name = "Goblin" };
        _characterRepository.Setup(r => r.GetByIdAsync(21)).ReturnsAsync(own);

        var result = await _service.RequestAccessAsync(MASTER_ID, new CampaignCharacterRequestInfo { CampaignId = CLOSED_CAMPAIGN, CharacterId = 21 });

        result.Status.Should().Be((int)CampaignCharacterStatus.Approved);
    }

    [Fact]
    public async Task ListMine_ReturnsUserParticipationsInCampaign()
    {
        _repository.Setup(r => r.ListByCampaignAndUserAsync(CLOSED_CAMPAIGN, PLAYER_ID)).ReturnsAsync(new List<CampaignCharacter>
        {
            new() { CampaignCharacterId = 60, CampaignId = CLOSED_CAMPAIGN, CharacterId = CHARACTER, Status = CampaignCharacterStatus.RequestedAccess }
        });

        var result = await _service.ListMineAsync(PLAYER_ID, CLOSED_CAMPAIGN);

        result.Should().ContainSingle(p => p.CharacterName == "Thorin" && p.Status == (int)CampaignCharacterStatus.RequestedAccess);
    }

    [Fact]
    public async Task ListMine_UnknownCampaign_Throws()
    {
        var act = () => _service.ListMineAsync(PLAYER_ID, 999);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Remove_Master_DeletesParticipation()
    {
        SetupParticipation(70, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        await _service.RemoveAsync(MASTER_ID, 70);

        _mapTokenRepository.Verify(r => r.DeleteByCampaignCharacterAsync(70), Times.Once);
        _repository.Verify(r => r.DeleteAsync(70), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.PARTY_CHANGED)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.MAP_TOKENS_CHANGED && e.MapId == null)), Times.Once);
        // The player has no other approved character there: he stops receiving the campaign's events.
        _notifier.Verify(n => n.RemoveUserFromCampaignAsync(PLAYER_ID, CLOSED_CAMPAIGN), Times.Once);
    }

    [Fact]
    public async Task Remove_PlayerWithAnotherApprovedCharacter_KeepsReceivingEvents()
    {
        SetupParticipation(70, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);
        _repository.Setup(r => r.HasApprovedCharacterAsync(CLOSED_CAMPAIGN, PLAYER_ID)).ReturnsAsync(true);

        await _service.RemoveAsync(MASTER_ID, 70);

        _notifier.Verify(n => n.RemoveUserFromCampaignAsync(It.IsAny<long>(), It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Remove_NotMaster_ThrowsAndKeepsParticipation()
    {
        SetupParticipation(71, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        var act = () => _service.RemoveAsync(PLAYER_ID, 71);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Remove_UnknownParticipation_Throws()
    {
        var act = () => _service.RemoveAsync(MASTER_ID, 999);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task ApproveRequest_StartsCurrentValuesAtTheTotalsAndReturnsThem()
    {
        SetupParticipation(80, CLOSED_CAMPAIGN, CampaignCharacterStatus.RequestedAccess);

        var result = await _service.ApproveRequestAsync(MASTER_ID, 80);

        result.CurrentLife.Should().Be(12);
        result.CurrentEnergy.Should().Be(6);
        result.TotalLife.Should().Be(12);
        result.TotalEnergy.Should().Be(6);
    }


    [Fact]
    public async Task ApproveRequest_StartsWithEmptyCampaignNotes()
    {
        SetupParticipation(84, CLOSED_CAMPAIGN, CampaignCharacterStatus.RequestedAccess);

        await _service.ApproveRequestAsync(MASTER_ID, 84);

        _repository.Verify(r => r.UpdateAsync(It.Is<CampaignCharacter>(p => p.Sheet == null && p.CharacterStatus == null)), Times.Once);
    }

    private static CampaignCharacterUpdateInfo Play(int life = -2, int energy = 6) =>
        new() { CurrentLife = life, CurrentEnergy = energy, CharacterStatus = "envenenado", Sheet = "Força 3 (ferido)" };

    [Theory]
    [InlineData(PLAYER_ID)]
    [InlineData(MASTER_ID)]
    public async Task Update_OwnerOrMaster_SavesOnlyTheParticipation(long userId)
    {
        SetupParticipation(81, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        var result = await _service.UpdateAsync(userId, 81, Play());

        result.CurrentLife.Should().Be(-2);
        result.CurrentEnergy.Should().Be(6);
        result.CharacterStatus.Should().Be("envenenado");
        result.Sheet.Should().Be("Força 3 (ferido)");
        result.CharacterMove.Should().Be(5);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<CampaignCharacter>()), Times.Once);
        _characterRepository.Verify(r => r.UpdateAsync(It.IsAny<Character>()), Times.Never);
    }

    [Fact]
    public async Task Update_OtherParticipant_Throws()
    {
        SetupParticipation(82, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);
        _repository.Setup(r => r.HasApprovedCharacterAsync(CLOSED_CAMPAIGN, OUTSIDER_ID)).ReturnsAsync(true);

        var act = () => _service.UpdateAsync(OUTSIDER_ID, 82, Play(1, 1));

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<CampaignCharacter>()), Times.Never);
    }

    [Fact]
    public async Task Update_AboveTotal_Throws()
    {
        SetupParticipation(83, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        var act = () => _service.UpdateAsync(PLAYER_ID, 83, Play(13, 1));

        await act.Should().ThrowAsync<DomainValidationException>();
    }

    [Theory]
    [InlineData(PLAYER_ID, false)]
    [InlineData(MASTER_ID, false)]
    [InlineData(OUTSIDER_ID, true)]
    public async Task GetById_OwnerMasterOrApprovedParticipant_ReturnsTheSheet(long userId, bool approvedParticipant)
    {
        _repository.Setup(r => r.GetByIdAsync(85)).ReturnsAsync(new CampaignCharacter
        {
            CampaignCharacterId = 85, CampaignId = CLOSED_CAMPAIGN, CharacterId = CHARACTER,
            Status = CampaignCharacterStatus.Approved, Sheet = "Ficha da campanha", CharacterStatus = "ferido"
        });
        _repository.Setup(r => r.HasApprovedCharacterAsync(CLOSED_CAMPAIGN, OUTSIDER_ID)).ReturnsAsync(approvedParticipant);

        var result = await _service.GetByIdAsync(userId, 85);

        result.Sheet.Should().Be("Ficha da campanha");
        result.CharacterStatus.Should().Be("ferido");
        result.CharacterSheet.Should().Be("Força 3");
    }

    [Fact]
    public async Task GetById_ReturnsTheCharactersToken()
    {
        SetupParticipation(87, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);
        _characterRepository.Setup(r => r.GetByIdAsync(CHARACTER)).ReturnsAsync(
            new Character { CharacterId = CHARACTER, UserId = PLAYER_ID, Name = "Thorin", Life = 12, Energy = 6, TokenId = 7 });
        _tokenRepository.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Token { TokenId = 7, Name = "Anão", UpImage = "anao.webp" });

        var result = await _service.GetByIdAsync(MASTER_ID, 87);

        result.CharacterTokenName.Should().Be("Anão");
        result.CharacterTokenImageUrl.Should().Be("https://cdn/anao.webp");
    }

    // ---- token chosen in the "Nesta campanha" area ----

    [Theory]
    [InlineData(PLAYER_ID)]
    [InlineData(MASTER_ID)]
    public async Task Update_WithToken_SavesItOnTheCharacter(long userId)
    {
        SetupParticipation(88, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);
        _tokenRepository.Setup(r => r.GetByIdAsync(9)).ReturnsAsync(new Token { TokenId = 9, Name = "Guerreiro" });
        var info = Play();
        info.TokenId = 9;

        await _service.UpdateAsync(userId, 88, info);

        _characterRepository.Verify(r => r.UpdateAsync(It.Is<Character>(c => c.TokenId == 9)), Times.Once);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<CampaignCharacter>()), Times.Once);
    }

    [Fact]
    public async Task Update_UnknownToken_ThrowsWithoutSaving()
    {
        SetupParticipation(89, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);
        var info = Play();
        info.TokenId = 404;

        var act = () => _service.UpdateAsync(MASTER_ID, 89, info);

        await act.Should().ThrowAsync<KeyNotFoundException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<CampaignCharacter>()), Times.Never);
        _characterRepository.Verify(r => r.UpdateAsync(It.IsAny<Character>()), Times.Never);
    }

    [Fact]
    public async Task GetById_NotInTheCampaign_Throws()
    {
        SetupParticipation(86, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        var act = () => _service.GetByIdAsync(OUTSIDER_ID, 86);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ---- 022: sheet file in the participation detail ----

    [Theory]
    [InlineData(MASTER_ID, false)]
    [InlineData(OUTSIDER_ID, true)]
    public async Task GetById_ReturnsTheCharactersSheetFile(long userId, bool approvedParticipant)
    {
        const string pdf = "0123456789abcdef0123456789abcdef.pdf";
        _characterRepository.Setup(r => r.GetByIdAsync(CHARACTER)).ReturnsAsync(
            new Character { CharacterId = CHARACTER, UserId = PLAYER_ID, Name = "Thorin", Life = 12, Energy = 6, SheetFile = pdf });
        SetupParticipation(87, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);
        _repository.Setup(r => r.HasApprovedCharacterAsync(CLOSED_CAMPAIGN, OUTSIDER_ID)).ReturnsAsync(approvedParticipant);

        var result = await _service.GetByIdAsync(userId, 87);

        result.SheetFileUrl.Should().Be("https://cdn/" + pdf);
        result.SheetFileType.Should().Be("pdf");
    }

    [Fact]
    public async Task GetById_WithoutSheetFile_ReturnsNulls()
    {
        SetupParticipation(88, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        var result = await _service.GetByIdAsync(MASTER_ID, 88);

        result.SheetFileUrl.Should().BeNull();
        result.SheetFileType.Should().BeNull();
    }
}
