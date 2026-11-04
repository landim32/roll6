using FluentAssertions;
using Roll6.Application.Realtime;

namespace Roll6.Tests.Application;

/// <summary>The walk permission and audience cache of the hub (069/108).</summary>
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
        connections.AllowWalk("c1", 42, NOW.AddSeconds(10), new long[] { 1, 2 });

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

        connections.AllowWalk("c1", 42, NOW.AddSeconds(10), new long[] { 1, 2 });
        connections.SetCampaign("c1", 2, 11);
        connections.IsWalkAllowed("c1", 42, NOW).Should().BeFalse();

        connections.AllowWalk("c1", 42, NOW.AddSeconds(10), new long[] { 1, 2 });
        connections.Remove("c1");
        connections.IsWalkAllowed("c1", 42, NOW).Should().BeFalse();
        connections.CampaignOf("c1").Should().BeNull();
    }

    private static TableConnections Followers(params (string Connection, long User, long Campaign)[] followers)
    {
        var connections = new TableConnections();
        foreach (var (connection, user, campaign) in followers)
        {
            connections.Add(connection, user);
            connections.SetCampaign(connection, user, campaign);
        }
        return connections;
    }

    [Fact]
    public void WalkPeers_AreTheAudienceFollowingTheCampaign_NotTheWalkerNorTheOthers()
    {
        var connections = Followers(("walker", 2, 10), ("second-tab", 2, 10), ("master", 1, 10), ("other-map", 3, 10), ("other-campaign", 1, 11));
        connections.AllowWalk("walker", 42, NOW.AddSeconds(10), new long[] { 1, 2 });

        connections.WalkPeers("walker", 42).Should().BeEquivalentTo("second-tab", "master");
    }

    [Fact]
    public void WalkPeers_ReachSomeoneWhoJustConnected()
    {
        var connections = Followers(("walker", 2, 10));
        connections.AllowWalk("walker", 42, NOW.AddSeconds(10), new long[] { 1, 2 });
        connections.WalkPeers("walker", 42).Should().BeEmpty();

        connections.Add("master", 1);
        connections.SetCampaign("master", 1, 10);

        connections.WalkPeers("walker", 42).Should().Equal("master");
    }

    [Fact]
    public void WalkPeers_WithoutAPermission_AreNobody()
    {
        Followers(("walker", 2, 10), ("master", 1, 10)).WalkPeers("walker", 42).Should().BeEmpty();
    }
}
