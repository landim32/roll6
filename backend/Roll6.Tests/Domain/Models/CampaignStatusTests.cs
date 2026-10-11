using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

/// <summary>The campaign status rules (049): only an active campaign plays; the master builds maps while preparing.</summary>
public class CampaignStatusTests
{
    [Theory]
    [InlineData(1, CampaignStatus.Preparing)]
    [InlineData(2, CampaignStatus.Active)]
    [InlineData(3, CampaignStatus.Paused)]
    [InlineData(4, CampaignStatus.Finished)]
    public void SetStatus_ValidValue_ChangesIt(int value, CampaignStatus expected)
    {
        var campaign = new Campaign { UpdatedAt = DateTime.UtcNow.AddDays(-1) };

        campaign.SetStatus(value);

        campaign.Status.Should().Be(expected);
        campaign.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    public void SetStatus_InvalidValue_Throws(int value)
    {
        var campaign = new Campaign();

        ((Action)(() => campaign.SetStatus(value))).Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("status");
        campaign.Status.Should().Be(CampaignStatus.Active);
    }

    [Theory]
    [InlineData(CampaignStatus.Preparing, false)]
    [InlineData(CampaignStatus.Active, true)]
    [InlineData(CampaignStatus.Paused, false)]
    [InlineData(CampaignStatus.Finished, false)]
    public void EnsurePlayable_OnlyActivePlays(CampaignStatus status, bool plays)
    {
        var act = () => new Campaign { Status = status }.EnsurePlayable();

        if (plays)
            act.Should().NotThrow();
        else
            act.Should().Throw<ConflictException>();
    }

    [Theory]
    [InlineData(CampaignStatus.Preparing, true, true)]
    [InlineData(CampaignStatus.Preparing, false, false)]
    [InlineData(CampaignStatus.Active, true, true)]
    [InlineData(CampaignStatus.Active, false, true)]
    [InlineData(CampaignStatus.Paused, true, false)]
    [InlineData(CampaignStatus.Paused, false, false)]
    [InlineData(CampaignStatus.Finished, true, false)]
    [InlineData(CampaignStatus.Finished, false, false)]
    public void EnsureMapEditable_FollowsTheMatrix(CampaignStatus status, bool isMaster, bool allowed)
    {
        var act = () => new Campaign { Status = status }.EnsureMapEditable(isMaster);

        if (allowed)
            act.Should().NotThrow();
        else
            act.Should().Throw<ConflictException>();
    }

    [Theory]
    [InlineData(CampaignStatus.Preparing, "A campanha está em preparação.")]
    [InlineData(CampaignStatus.Paused, "A campanha está pausada.")]
    [InlineData(CampaignStatus.Finished, "A campanha está finalizada.")]
    public void Refusal_NamesTheStatus(CampaignStatus status, string message)
    {
        var act = () => new Campaign { Status = status }.EnsurePlayable();

        act.Should().Throw<ConflictException>().WithMessage(message);
    }
}
