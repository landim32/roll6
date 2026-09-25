using FluentAssertions;
using SimpleTabletopMap.Domain.Enums;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Models;

namespace SimpleTabletopMap.Tests.Domain.Models;

public class CampaignCharacterTests
{
    private const int LIFE = 12;
    private const int ENERGY = 6;

    private static CampaignCharacter With(CampaignCharacterStatus status, int currentLife = 3, int currentEnergy = 1) =>
        new() { CampaignId = 1, CharacterId = 2, Status = status, CurrentLife = currentLife, CurrentEnergy = currentEnergy };

    [Theory]
    [InlineData(true, CampaignCharacterStatus.Approved)]
    [InlineData(false, CampaignCharacterStatus.RequestedAccess)]
    public void RequestAccess_DependsOnAutoApprove(bool autoApprove, CampaignCharacterStatus expected)
    {
        CampaignCharacter.RequestAccess(1, 2, autoApprove, LIFE, ENERGY).Status.Should().Be(expected);
    }

    [Fact]
    public void CreateInvite_IsInvited()
    {
        CampaignCharacter.CreateInvite(1, 2, LIFE, ENERGY).Status.Should().Be(CampaignCharacterStatus.Invited);
    }

    [Fact]
    public void Creation_StartsCurrentValuesAtTheTotals()
    {
        var requested = CampaignCharacter.RequestAccess(1, 2, false, LIFE, ENERGY);
        var invited = CampaignCharacter.CreateInvite(1, 2, LIFE, ENERGY);

        foreach (var participation in new[] { requested, invited })
        {
            participation.CurrentLife.Should().Be(LIFE);
            participation.CurrentEnergy.Should().Be(ENERGY);
        }
    }

    [Theory]
    [InlineData(CampaignCharacterStatus.Approved, "já participa")]
    [InlineData(CampaignCharacterStatus.Invited, "aceite o convite")]
    [InlineData(CampaignCharacterStatus.RequestedAccess, "pendente")]
    [InlineData(CampaignCharacterStatus.Denied, "recusado")]
    public void EnsureCanRequestAgain_AlwaysThrowsWithReason(CampaignCharacterStatus status, string reason)
    {
        var act = () => With(status).EnsureCanRequestAgain();

        act.Should().Throw<ConflictException>().WithMessage($"*{reason}*");
    }

    [Theory]
    [InlineData(CampaignCharacterStatus.Denied, CampaignCharacterStatus.Invited)]
    [InlineData(CampaignCharacterStatus.RequestedAccess, CampaignCharacterStatus.Approved)]
    public void Invite_ValidTransitions(CampaignCharacterStatus from, CampaignCharacterStatus to)
    {
        var participation = With(from);

        participation.Invite(LIFE, ENERGY);

        participation.Status.Should().Be(to);
    }

    [Theory]
    [InlineData(CampaignCharacterStatus.Invited)]
    [InlineData(CampaignCharacterStatus.Approved)]
    public void Invite_InvalidTransitions_Throw(CampaignCharacterStatus from)
    {
        var act = () => With(from).Invite(LIFE, ENERGY);

        act.Should().Throw<ConflictException>();
    }

    [Fact]
    public void AcceptAndDeclineInvite_OnlyFromInvited()
    {
        var accepted = With(CampaignCharacterStatus.Invited);
        accepted.AcceptInvite(LIFE, ENERGY);
        accepted.Status.Should().Be(CampaignCharacterStatus.Approved);

        var declined = With(CampaignCharacterStatus.Invited);
        declined.DeclineInvite();
        declined.Status.Should().Be(CampaignCharacterStatus.Denied);

        foreach (var status in new[] { CampaignCharacterStatus.RequestedAccess, CampaignCharacterStatus.Approved, CampaignCharacterStatus.Denied })
        {
            ((Action)(() => With(status).AcceptInvite(LIFE, ENERGY))).Should().Throw<ConflictException>();
            ((Action)(() => With(status).DeclineInvite())).Should().Throw<ConflictException>();
        }
    }

    [Fact]
    public void ApproveAndDenyRequest_OnlyFromRequestedAccess()
    {
        var approved = With(CampaignCharacterStatus.RequestedAccess);
        approved.ApproveRequest(LIFE, ENERGY);
        approved.Status.Should().Be(CampaignCharacterStatus.Approved);

        var denied = With(CampaignCharacterStatus.RequestedAccess);
        denied.DenyRequest();
        denied.Status.Should().Be(CampaignCharacterStatus.Denied);

        foreach (var status in new[] { CampaignCharacterStatus.Invited, CampaignCharacterStatus.Approved, CampaignCharacterStatus.Denied })
        {
            ((Action)(() => With(status).ApproveRequest(LIFE, ENERGY))).Should().Throw<ConflictException>();
            ((Action)(() => With(status).DenyRequest())).Should().Throw<ConflictException>();
        }
    }

    [Fact]
    public void JoiningTheCampaign_ResetsCurrentValuesToTheTotals()
    {
        var accepted = With(CampaignCharacterStatus.Invited);
        accepted.AcceptInvite(LIFE, ENERGY);

        var approved = With(CampaignCharacterStatus.RequestedAccess);
        approved.ApproveRequest(LIFE, ENERGY);

        var invitedWhilePending = With(CampaignCharacterStatus.RequestedAccess);
        invitedWhilePending.Invite(LIFE, ENERGY);

        foreach (var participation in new[] { accepted, approved, invitedWhilePending })
        {
            participation.CurrentLife.Should().Be(LIFE);
            participation.CurrentEnergy.Should().Be(ENERGY);
        }
    }

    [Theory]
    [InlineData(8, 5)]
    [InlineData(LIFE, ENERGY)]
    [InlineData(-2, 0)]
    public void SetVitals_Approved_AcceptsUpToTheTotalsAndNegatives(int life, int energy)
    {
        var participation = With(CampaignCharacterStatus.Approved);

        participation.SetVitals(life, energy, LIFE, ENERGY);

        participation.CurrentLife.Should().Be(life);
        participation.CurrentEnergy.Should().Be(energy);
    }

    [Theory]
    [InlineData(LIFE + 1, ENERGY, "currentLife")]
    [InlineData(LIFE, ENERGY + 1, "currentEnergy")]
    public void SetVitals_AboveTotal_Throws(int life, int energy, string field)
    {
        var act = () => With(CampaignCharacterStatus.Approved).SetVitals(life, energy, LIFE, ENERGY);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Theory]
    [InlineData(CampaignCharacterStatus.Invited)]
    [InlineData(CampaignCharacterStatus.RequestedAccess)]
    [InlineData(CampaignCharacterStatus.Denied)]
    public void SetVitals_NotApproved_Throws(CampaignCharacterStatus status)
    {
        var act = () => With(status).SetVitals(1, 1, LIFE, ENERGY);

        act.Should().Throw<ConflictException>();
    }
}
