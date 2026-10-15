using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class CampaignTests
{
    [Fact]
    public void NewCampaign_IsNotFree()
    {
        new Campaign().FreeMode.Should().BeFalse();
    }

    [Fact]
    public void SetPendingNotice_StartsOnAndToggles()
    {
        var campaign = new Campaign();
        campaign.PendingNotice.Should().BeTrue();

        campaign.SetPendingNotice(false);
        campaign.PendingNotice.Should().BeFalse();
        campaign.SetPendingNotice(true);
        campaign.PendingNotice.Should().BeTrue();
    }

    [Fact]
    public void SetFreeMode_TogglesAndBumpsUpdatedAt()
    {
        var campaign = new Campaign { CampaignId = 10, UpdatedAt = DateTime.UtcNow.AddDays(-1) };

        campaign.SetFreeMode(true);
        campaign.FreeMode.Should().BeTrue();
        campaign.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));

        campaign.SetFreeMode(false);
        campaign.FreeMode.Should().BeFalse();
    }

    [Fact]
    public void SetCurrentTurn_SetsTheTurnAndTheUpdateDate()
    {
        var campaign = new Campaign { CampaignId = 10, CurrentTurn = 5, UpdatedAt = DateTime.UtcNow.AddDays(-1) };

        campaign.SetCurrentTurn(2);

        campaign.CurrentTurn.Should().Be(2);
        campaign.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public void SetCurrentTurn_BelowOne_Throws(int turnNo)
    {
        var campaign = new Campaign { CampaignId = 10, CurrentTurn = 5 };

        ((Action)(() => campaign.SetCurrentTurn(turnNo))).Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("turnNo");
        campaign.CurrentTurn.Should().Be(5);
    }
}
