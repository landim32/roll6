using FluentAssertions;
using Roll6.Application.Realtime;

namespace Roll6.Tests.Application;

/// <summary>The walk permission cache of the hub (069).</summary>
public class TableConnectionsTests
{
    private static readonly DateTime NOW = new(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Walk_IsAllowedUntilItExpires()
    {
        var connections = new TableConnections();
        connections.Add("c1", 2);
        connections.SetCampaign("c1", 2, 10);

        connections.IsWalkAllowed("c1", 42, NOW).Should().BeFalse();
        connections.AllowWalk("c1", 42, NOW.AddSeconds(10));

        connections.IsWalkAllowed("c1", 42, NOW.AddSeconds(9)).Should().BeTrue();
        connections.IsWalkAllowed("c1", 42, NOW.AddSeconds(10)).Should().BeFalse();
        connections.IsWalkAllowed("c1", 43, NOW).Should().BeFalse();
        connections.IsWalkAllowed("c2", 42, NOW).Should().BeFalse();
    }

    [Fact]
    public void Walk_IsForgottenOnAnotherCampaignOrDisconnect()
    {
        var connections = new TableConnections();
        connections.Add("c1", 2);
        connections.SetCampaign("c1", 2, 10);
        connections.CampaignOf("c1").Should().Be(10);

        connections.AllowWalk("c1", 42, NOW.AddSeconds(10));
        connections.SetCampaign("c1", 2, 11);
        connections.IsWalkAllowed("c1", 42, NOW).Should().BeFalse();

        connections.AllowWalk("c1", 42, NOW.AddSeconds(10));
        connections.Remove("c1");
        connections.IsWalkAllowed("c1", 42, NOW).Should().BeFalse();
        connections.CampaignOf("c1").Should().BeNull();
    }
}
