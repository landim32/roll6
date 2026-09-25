using FluentAssertions;
using Moq;
using SimpleTabletopMap.Domain.Enums;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Domain.Services;
using SimpleTabletopMap.DTO.CampaignCharacter;
using SimpleTabletopMap.Infra.Interfaces.AppServices;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Tests.Domain.Services;

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

        var character = new Character { CharacterId = CHARACTER, UserId = PLAYER_ID, Name = "Thorin", Life = 12, Energy = 6 };
        _characterRepository.Setup(r => r.GetByIdAsync(CHARACTER)).ReturnsAsync(character);
        _characterRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Character> { character });

        _userRepository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<User>
        {
            new() { UserId = MASTER_ID, Name = "Mestre Ana" },
            new() { UserId = PLAYER_ID, Name = "Bruno" }
        });
        _repository.Setup(r => r.InsertAsync(It.IsAny<CampaignCharacter>())).ReturnsAsync((CampaignCharacter c) => c);
        _repository.Setup(r => r.UpdateAsync(It.IsAny<CampaignCharacter>())).ReturnsAsync((CampaignCharacter c) => c);

        _service = new CampaignCharacterService(_repository.Object, _campaignRepository.Object,
            _characterRepository.Object, _userRepository.Object, Mock.Of<IImageStorageAppService>());
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
    }

    [Fact]
    public async Task DenyRequest_ByPlayer_Throws()
    {
        SetupParticipation(50, CLOSED_CAMPAIGN, CampaignCharacterStatus.RequestedAccess);

        var act = () => _service.DenyRequestAsync(PLAYER_ID, 50);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
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

        _repository.Verify(r => r.DeleteAsync(70), Times.Once);
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

    [Theory]
    [InlineData(PLAYER_ID)]
    [InlineData(MASTER_ID)]
    public async Task UpdateVitals_OwnerOrMaster_Saves(long userId)
    {
        SetupParticipation(81, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        var result = await _service.UpdateVitalsAsync(userId, 81, new CampaignCharacterVitalsInfo { CurrentLife = -2, CurrentEnergy = 6 });

        result.CurrentLife.Should().Be(-2);
        result.CurrentEnergy.Should().Be(6);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<CampaignCharacter>()), Times.Once);
    }

    [Fact]
    public async Task UpdateVitals_Outsider_Throws()
    {
        SetupParticipation(82, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        var act = () => _service.UpdateVitalsAsync(OUTSIDER_ID, 82, new CampaignCharacterVitalsInfo { CurrentLife = 1, CurrentEnergy = 1 });

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.UpdateAsync(It.IsAny<CampaignCharacter>()), Times.Never);
    }

    [Fact]
    public async Task UpdateVitals_AboveTotal_Throws()
    {
        SetupParticipation(83, CLOSED_CAMPAIGN, CampaignCharacterStatus.Approved);

        var act = () => _service.UpdateVitalsAsync(PLAYER_ID, 83, new CampaignCharacterVitalsInfo { CurrentLife = 13, CurrentEnergy = 1 });

        await act.Should().ThrowAsync<DomainValidationException>();
    }
}
