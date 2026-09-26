using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class CampaignCharacterTests
{
    private const int LIFE = 12;
    private const int ENERGY = 6;
    private const string SHEET = "Força 3";

    private static readonly Character Hero = new() { CharacterId = 2, Life = LIFE, Energy = ENERGY, Sheet = SHEET };

    private static CampaignCharacter With(CampaignCharacterStatus status, int currentLife = 3, int currentEnergy = 1) =>
        new()
        {
            CampaignId = 1, CharacterId = 2, Status = status, CurrentLife = currentLife, CurrentEnergy = currentEnergy,
            CharacterStatus = "envenenado", Sheet = "Anotações antigas"
        };

    [Theory]
    [InlineData(true, CampaignCharacterStatus.Approved)]
    [InlineData(false, CampaignCharacterStatus.RequestedAccess)]
    public void RequestAccess_DependsOnAutoApprove(bool autoApprove, CampaignCharacterStatus expected)
    {
        CampaignCharacter.RequestAccess(1, Hero, autoApprove).Status.Should().Be(expected);
    }

    [Fact]
    public void CreateInvite_IsInvited()
    {
        CampaignCharacter.CreateInvite(1, Hero).Status.Should().Be(CampaignCharacterStatus.Invited);
    }

    [Fact]
    public void Creation_StartsFromTheCharacter()
    {
        var requested = CampaignCharacter.RequestAccess(1, Hero, false);
        var invited = CampaignCharacter.CreateInvite(1, Hero);

        foreach (var participation in new[] { requested, invited })
        {
            participation.CharacterId.Should().Be(Hero.CharacterId);
            participation.CurrentLife.Should().Be(LIFE);
            participation.CurrentEnergy.Should().Be(ENERGY);
            participation.Sheet.Should().Be(SHEET);
            participation.CharacterStatus.Should().BeNull();
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

        participation.Invite(Hero);

        participation.Status.Should().Be(to);
    }

    [Theory]
    [InlineData(CampaignCharacterStatus.Invited)]
    [InlineData(CampaignCharacterStatus.Approved)]
    public void Invite_InvalidTransitions_Throw(CampaignCharacterStatus from)
    {
        var act = () => With(from).Invite(Hero);

        act.Should().Throw<ConflictException>();
    }

    [Fact]
    public void AcceptAndDeclineInvite_OnlyFromInvited()
    {
        var accepted = With(CampaignCharacterStatus.Invited);
        accepted.AcceptInvite(Hero);
        accepted.Status.Should().Be(CampaignCharacterStatus.Approved);

        var declined = With(CampaignCharacterStatus.Invited);
        declined.DeclineInvite();
        declined.Status.Should().Be(CampaignCharacterStatus.Denied);

        foreach (var status in new[] { CampaignCharacterStatus.RequestedAccess, CampaignCharacterStatus.Approved, CampaignCharacterStatus.Denied })
        {
            ((Action)(() => With(status).AcceptInvite(Hero))).Should().Throw<ConflictException>();
            ((Action)(() => With(status).DeclineInvite())).Should().Throw<ConflictException>();
        }
    }

    [Fact]
    public void ApproveAndDenyRequest_OnlyFromRequestedAccess()
    {
        var approved = With(CampaignCharacterStatus.RequestedAccess);
        approved.ApproveRequest(Hero);
        approved.Status.Should().Be(CampaignCharacterStatus.Approved);

        var denied = With(CampaignCharacterStatus.RequestedAccess);
        denied.DenyRequest();
        denied.Status.Should().Be(CampaignCharacterStatus.Denied);

        foreach (var status in new[] { CampaignCharacterStatus.Invited, CampaignCharacterStatus.Approved, CampaignCharacterStatus.Denied })
        {
            ((Action)(() => With(status).ApproveRequest(Hero))).Should().Throw<ConflictException>();
            ((Action)(() => With(status).DenyRequest())).Should().Throw<ConflictException>();
        }
    }

    [Fact]
    public void JoiningTheCampaign_StartsOverFromTheCharacter()
    {
        var accepted = With(CampaignCharacterStatus.Invited);
        accepted.AcceptInvite(Hero);

        var approved = With(CampaignCharacterStatus.RequestedAccess);
        approved.ApproveRequest(Hero);

        var invitedWhilePending = With(CampaignCharacterStatus.RequestedAccess);
        invitedWhilePending.Invite(Hero);

        foreach (var participation in new[] { accepted, approved, invitedWhilePending })
        {
            participation.CurrentLife.Should().Be(LIFE);
            participation.CurrentEnergy.Should().Be(ENERGY);
            participation.Sheet.Should().Be(SHEET);
            participation.CharacterStatus.Should().BeNull();
        }
    }

    [Fact]
    public void InviteAfterDenied_KeepsTheCampaignData()
    {
        var participation = With(CampaignCharacterStatus.Denied);

        participation.Invite(Hero);

        participation.Sheet.Should().Be("Anotações antigas");
        participation.CharacterStatus.Should().Be("envenenado");
    }

    [Theory]
    [InlineData(8, 5)]
    [InlineData(LIFE, ENERGY)]
    [InlineData(-2, 0)]
    public void UpdatePlay_Approved_AcceptsUpToTheTotalsAndNegatives(int life, int energy)
    {
        var participation = With(CampaignCharacterStatus.Approved);

        participation.UpdatePlay(life, energy, " ferido ", "Força 4", LIFE, ENERGY);

        participation.CurrentLife.Should().Be(life);
        participation.CurrentEnergy.Should().Be(energy);
        participation.CharacterStatus.Should().Be("ferido");
        participation.Sheet.Should().Be("Força 4");
    }

    [Fact]
    public void UpdatePlay_BlankTexts_BecomeNull()
    {
        var participation = With(CampaignCharacterStatus.Approved);

        participation.UpdatePlay(1, 1, "  ", "", LIFE, ENERGY);

        participation.CharacterStatus.Should().BeNull();
        participation.Sheet.Should().BeNull();
    }

    [Theory]
    [InlineData(LIFE + 1, ENERGY, "currentLife")]
    [InlineData(LIFE, ENERGY + 1, "currentEnergy")]
    public void UpdatePlay_AboveTotal_Throws(int life, int energy, string field)
    {
        var act = () => With(CampaignCharacterStatus.Approved).UpdatePlay(life, energy, null, null, LIFE, ENERGY);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Fact]
    public void UpdatePlay_TooLongTexts_Throw()
    {
        var longStatus = () => With(CampaignCharacterStatus.Approved).UpdatePlay(1, 1, new string('x', 261), null, LIFE, ENERGY);
        var longSheet = () => With(CampaignCharacterStatus.Approved).UpdatePlay(1, 1, null, new string('x', 20001), LIFE, ENERGY);

        longStatus.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("characterStatus");
        longSheet.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("sheet");
    }

    [Theory]
    [InlineData(CampaignCharacterStatus.Invited)]
    [InlineData(CampaignCharacterStatus.RequestedAccess)]
    [InlineData(CampaignCharacterStatus.Denied)]
    public void UpdatePlay_NotApproved_Throws(CampaignCharacterStatus status)
    {
        var act = () => With(status).UpdatePlay(1, 1, null, null, LIFE, ENERGY);

        act.Should().Throw<ConflictException>();
    }
}
