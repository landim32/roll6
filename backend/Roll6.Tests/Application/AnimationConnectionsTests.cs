using FluentAssertions;
using Roll6.Application.Realtime;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Tests.Application;

/// <summary>The relay of the animation editor hub (086): agents, editors, the queue and its rules.</summary>
public class AnimationConnectionsTests
{
    private static readonly DateTime NOW = new(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);
    private readonly AnimationConnections _connections = new();

    private EditorRequest? Enqueue(long userId, long animationId, string prompt = "oi") =>
        _connections.Enqueue(userId, animationId, "Aceno", 100, Guid.NewGuid(), false, prompt, Array.Empty<PromptImageInfo>(), null, NOW);

    [Fact]
    public void AgentStatusFollowsTheAgentsOfTheUser()
    {
        _connections.AgentStatusOf(1).Should().BeEquivalentTo(new AgentStatusInfo { Connected = false, Busy = false, Machine = null });

        _connections.AddAgent("a1", 1, "PC-A", @"C:\mesa");
        _connections.AgentStatusOf(1).Should().BeEquivalentTo(new AgentStatusInfo { Connected = true, Busy = false, Machine = "PC-A" });
        _connections.AgentStatusOf(2).Connected.Should().BeFalse("another user");
        _connections.AgentUserOf("a1").Should().Be(1);
        _connections.AgentUserOf("x").Should().BeNull();

        Enqueue(1, 7);
        _connections.NextRunnable(1, NOW).Should().NotBeNull();
        _connections.AgentStatusOf(1).Busy.Should().BeTrue();
    }

    [Fact]
    public void TheQueueIsFifoAcrossAnimationsAndOnePerAnimation()
    {
        var first = Enqueue(1, 7)!;
        var second = Enqueue(1, 8)!;
        Enqueue(1, 7).Should().BeNull("the animation already has a request");

        _connections.QueuePosition(first.RequestId).Should().Be(1);
        _connections.QueuePosition(second.RequestId).Should().Be(2);
        _connections.Running(7).Should().BeSameAs(first);
        _connections.NextRunnable(1, NOW).Should().BeNull("no agent yet");

        _connections.AddAgent("a1", 1, "PC-A", "");
        var started = _connections.NextRunnable(1, NOW)!.Value;
        started.Request.Should().BeSameAs(first);
        started.AgentConnectionId.Should().Be("a1");
        first.State.Should().Be(RequestState.Running);
        first.Machine.Should().Be("PC-A");
        _connections.QueuePosition(first.RequestId).Should().BeNull();
        _connections.QueuePosition(second.RequestId).Should().Be(1);
        _connections.NextRunnable(1, NOW).Should().BeNull("the only agent is busy");
        _connections.IsRunBy(first.RequestId, "a1").Should().BeTrue();
        _connections.IsRunBy(second.RequestId, "a1").Should().BeFalse();

        _connections.Finish(first.RequestId).Should().BeSameAs(first);
        _connections.Running(7).Should().BeNull();
        _connections.NextRunnable(1, NOW)!.Value.Request.Should().BeSameAs(second);
    }

    [Fact]
    public void TwoAgentsTakeTwoRequests()
    {
        _connections.AddAgent("a1", 1, "PC-A", "");
        _connections.AddAgent("a2", 1, "PC-B", "");
        var first = Enqueue(1, 7)!;
        var second = Enqueue(1, 8)!;

        var agents = new[] { _connections.NextRunnable(1, NOW)!.Value, _connections.NextRunnable(1, NOW)!.Value };

        agents.Select(a => a.Request).Should().Equal(first, second);
        agents.Select(a => a.AgentConnectionId).Should().BeEquivalentTo("a1", "a2");
        _connections.NextRunnable(1, NOW).Should().BeNull();
        _connections.AgentStatusOf(1).Busy.Should().BeTrue();
    }

    [Fact]
    public void ADroppedAgentHandsBackItsRequestAndTheNextOneWaits()
    {
        _connections.AddAgent("a1", 1, "PC-A", "");
        var first = Enqueue(1, 7)!;
        var second = Enqueue(1, 8)!;
        _connections.NextRunnable(1, NOW);

        var dropped = _connections.RemoveAgent("a1");

        dropped.Should().BeSameAs(first);
        _connections.Get(first.RequestId).Should().BeNull();
        _connections.Running(8).Should().BeSameAs(second);
        _connections.NextRunnable(1, NOW).Should().BeNull("no agent left");
        _connections.AgentStatusOf(1).Connected.Should().BeFalse();
        _connections.RemoveAgent("a1").Should().BeNull();
    }

    [Fact]
    public void UsersAreIsolated()
    {
        _connections.AddAgent("a2", 2, "PC-B", "");
        Enqueue(1, 7);

        _connections.NextRunnable(1, NOW).Should().BeNull("the agent belongs to another user");
        _connections.NextRunnable(2, NOW).Should().BeNull("nothing queued for that user");
        _connections.AgentsOf(1).Should().BeEmpty();
        _connections.AgentsOf(2).Should().Equal("a2");
    }

    [Fact]
    public void EditorsAreListedByAnimationAndByUser()
    {
        _connections.AddEditor("e1", 1, 7);
        _connections.AddEditor("e2", 1, 8);
        _connections.AddEditor("e3", 2, 7);

        _connections.EditorsOf(7).Should().BeEquivalentTo("e1", "e3");
        _connections.EditorsOfUser(1).Should().BeEquivalentTo("e1", "e2");
        _connections.RemoveEditor("e1").Should().Be(7);
        _connections.RemoveEditor("e1").Should().BeNull();
        _connections.EditorsOf(7).Should().Equal("e3");
        AnimationConnections.GroupName(7).Should().Be("animation:7");
    }

    [Fact]
    public void TheTextOfARunningRequestGrows()
    {
        var request = Enqueue(1, 7)!;

        request.Append("Olá");
        request.Append(", mundo");

        request.Text.Should().Be("Olá, mundo");
        request.Started.Should().BeFalse();
    }
}
