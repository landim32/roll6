using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Roll6.Application.Notifications;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Application;

/// <summary>074: one pass over the push outbox — parallel, retries, dead devices skipped, nothing lost.</summary>
public class PushDeliveryRunnerTests
{
    private static readonly DateTime NOW = new(2026, 10, 15, 21, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IPushDeliveryRepository<PushDelivery>> _deliveries = new();
    private readonly Mock<IPushSubscriptionRepository<PushSubscription>> _subscriptions = new();
    private readonly Mock<IPushSender> _sender = new();
    private readonly List<PushDelivery> _due = new();
    private readonly List<PushSubscription> _devices = new();
    private readonly PushDeliveryRunner _runner;

    public PushDeliveryRunnerTests()
    {
        _deliveries.Setup(r => r.ListDueAsync(It.IsAny<DateTime>(), It.IsAny<int>())).ReturnsAsync(() => _due.ToList());
        _subscriptions.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<long>>()))
            .ReturnsAsync((IReadOnlyCollection<long> ids) => _devices.Where(d => ids.Contains(d.PushSubscriptionId)).ToList());
        _subscriptions.Setup(r => r.RecordFailureAsync(It.IsAny<long>())).ReturnsAsync(1);
        _runner = new PushDeliveryRunner(_deliveries.Object, _subscriptions.Object, _sender.Object, new TestClock(NOW),
            NullLogger<PushDeliveryRunner>.Instance);
    }

    private PushSubscription Device(long id)
    {
        var device = new PushSubscription { PushSubscriptionId = id, UserId = id, Endpoint = $"https://push/{id}", P256dh = "k", Auth = "a" };
        _devices.Add(device);
        return device;
    }

    private PushDelivery Due(long id, long deviceId)
    {
        var delivery = PushDelivery.Create(deviceId, $"{{\"n\":{id}}}", $"c10-message", NOW.AddMinutes(-1));
        delivery.PushDeliveryId = id;
        delivery.NextAttemptAt = NOW;
        _due.Add(delivery);
        return delivery;
    }

    private void Answer(Func<PushTarget, PushSendResult> answer) =>
        _sender.Setup(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>()))
            .ReturnsAsync((PushTarget t, string _, string _, TimeSpan _) => answer(t));

    [Fact]
    public async Task NothingDue_HandlesNothing()
    {
        (await _runner.RunOnceAsync()).Should().Be(0);
        _deliveries.Verify(r => r.DeleteExpiredAsync(NOW), Times.Once);
    }

    [Fact]
    public async Task Sent_IsDeleted_AndTheDeviceSucceeded()
    {
        Device(1);
        Due(11, 1);
        Answer(_ => PushSendResult.Sent);

        (await _runner.RunOnceAsync()).Should().Be(1);

        _deliveries.Verify(r => r.DeleteAsync(11), Times.Once);
        _subscriptions.Verify(r => r.RecordSuccessAsync(1, NOW), Times.Once);
        _sender.Verify(s => s.SendAsync(It.Is<PushTarget>(t => t.Endpoint == "https://push/1"), "{\"n\":11}", "c10-message",
            It.Is<TimeSpan>(ttl => ttl > TimeSpan.FromHours(11))), Times.Once);
    }

    [Fact]
    public async Task Gone_RemovesTheDevice()
    {
        Device(1);
        Due(11, 1);
        Due(12, 1);
        Answer(_ => PushSendResult.Gone);

        await _runner.RunOnceAsync();

        _subscriptions.Verify(r => r.DeleteAsync(1), Times.Once);
        // The second push of that device was never tried.
        _sender.Verify(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>()), Times.Once);
    }

    [Fact]
    public async Task Failed_IsRetriedLater_AndCountsOneFailure()
    {
        Device(1);
        Due(11, 1);
        Due(12, 1);
        Answer(_ => PushSendResult.Failed);

        await _runner.RunOnceAsync();

        _subscriptions.Verify(r => r.RecordFailureAsync(1), Times.Once);
        _deliveries.Verify(r => r.UpdateAsync(It.Is<PushDelivery>(d => d.Attempts == 1 && d.NextAttemptAt == NOW.AddSeconds(30))), Times.Exactly(2));
        _deliveries.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Failed_OutOfAttempts_IsDropped()
    {
        Device(1);
        var delivery = Due(11, 1);
        delivery.Attempts = PushPolicy.RETRY.Count;
        Answer(_ => PushSendResult.Failed);

        await _runner.RunOnceAsync();

        _deliveries.Verify(r => r.DeleteAsync(11), Times.Once);
    }

    [Fact]
    public async Task TheFifthFailureInARow_SkipsTheDevice_AndDropsItsPushes()
    {
        Device(1);
        Due(11, 1);
        _subscriptions.Setup(r => r.RecordFailureAsync(1)).ReturnsAsync(PushPolicy.MAX_FAILURES);
        Answer(_ => PushSendResult.Failed);

        await _runner.RunOnceAsync();

        _deliveries.Verify(r => r.DeleteBySubscriptionAsync(1), Times.Once);
        _deliveries.Verify(r => r.UpdateAsync(It.IsAny<PushDelivery>()), Times.Never);
    }

    [Fact]
    public async Task ADeadDevice_DoesNotHoldTheOthers()
    {
        // Device 1 hangs; devices 2 and 3 answer at once and must not wait for it.
        Device(1);
        Device(2);
        Device(3);
        Due(11, 1);
        Due(21, 2);
        Due(31, 3);
        var hang = new TaskCompletionSource<PushSendResult>();
        var fast = new TaskCompletionSource();
        var answered = 0;
        _sender.Setup(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>()))
            .Returns((PushTarget t, string _, string _, TimeSpan _) =>
            {
                if (t.Endpoint.EndsWith("/1"))
                    return hang.Task;
                if (Interlocked.Increment(ref answered) == 2)
                    fast.SetResult();
                return Task.FromResult(PushSendResult.Sent);
            });

        var pass = _runner.RunOnceAsync();

        (await Task.WhenAny(fast.Task, Task.Delay(2000))).Should().Be(fast.Task, "the other devices are sent while the first hangs");
        hang.SetResult(PushSendResult.Failed);
        await pass;
        _deliveries.Verify(r => r.DeleteAsync(21), Times.Once);
        _deliveries.Verify(r => r.DeleteAsync(31), Times.Once);
    }

    [Fact]
    public async Task OneDevice_NeverHasTwoPushesInFlight()
    {
        Device(1);
        Due(11, 1);
        Due(12, 1);
        Due(13, 1);
        var inFlight = 0;
        var most = 0;
        _sender.Setup(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>()))
            .Returns(async () =>
            {
                most = Math.Max(most, Interlocked.Increment(ref inFlight));
                await Task.Delay(20);
                Interlocked.Decrement(ref inFlight);
                return PushSendResult.Sent;
            });

        await _runner.RunOnceAsync();

        most.Should().Be(1);
        _deliveries.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Exactly(3));
    }

    [Fact]
    public async Task APushOfARemovedDevice_IsDropped()
    {
        Due(11, 99);

        await _runner.RunOnceAsync();

        _deliveries.Verify(r => r.DeleteAsync(11), Times.Once);
        _sender.Verify(s => s.SendAsync(It.IsAny<PushTarget>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan>()), Times.Never);
    }
}
