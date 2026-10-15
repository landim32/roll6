using FluentAssertions;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;

namespace Roll6.Tests.Domain.Models;

/// <summary>074: the outbox row's retry schedule and the device's failure count.</summary>
public class PushDeliveryTests
{
    private static readonly DateTime NOW = new(2026, 10, 15, 21, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Create_IsDueNow_AndLives12Hours()
    {
        var delivery = PushDelivery.Create(7, "{}", "c10-message-and-a-very-long-topic", NOW);

        (delivery.NextAttemptAt, delivery.ExpiresAt, delivery.Attempts).Should().Be((NOW, NOW.AddHours(12), 0));
        delivery.Topic.Should().HaveLength(PushDelivery.MAX_TOPIC);
        delivery.TimeToLive(NOW.AddHours(11)).Should().Be(TimeSpan.FromHours(1));
        delivery.TimeToLive(NOW.AddHours(13)).Should().Be(TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void Failed_RetriesAfter30s_2min_10min_ThenGivesUp()
    {
        var delivery = PushDelivery.Create(7, "{}", "t", NOW);

        delivery.Failed(NOW).Should().BeTrue();
        delivery.NextAttemptAt.Should().Be(NOW.AddSeconds(30));
        delivery.Failed(NOW).Should().BeTrue();
        delivery.NextAttemptAt.Should().Be(NOW.AddMinutes(2));
        delivery.Failed(NOW).Should().BeTrue();
        delivery.NextAttemptAt.Should().Be(NOW.AddMinutes(10));
        delivery.Failed(NOW).Should().BeFalse();
        delivery.Attempts.Should().Be(PushPolicy.RETRY.Count);
    }

    [Fact]
    public void Failed_NeverSchedulesPastTheExpiry()
    {
        var delivery = PushDelivery.Create(7, "{}", "t", NOW);

        delivery.Failed(NOW.AddHours(12).AddSeconds(-10)).Should().BeFalse();
        delivery.IsExpired(NOW.AddHours(12)).Should().BeTrue();
    }

    [Fact]
    public void Subscription_IsSkippedAt5FailuresInARow_AndASuccessOrNewRegistrationResets()
    {
        var device = PushSubscription.Create(2, "https://push.example/abc", "k", "a", "Chrome");
        for (var i = 0; i < PushPolicy.MAX_FAILURES - 1; i++)
            device.Failed();
        device.Skipped.Should().BeFalse();
        device.Failed();
        device.Skipped.Should().BeTrue();

        device.Succeeded(NOW);
        (device.Skipped, device.LastUsedAt).Should().Be((false, (DateTime?)NOW));

        for (var i = 0; i < PushPolicy.MAX_FAILURES; i++)
            device.Failed();
        device.MoveTo(3, "k2", "a2", "Firefox");
        device.FailureCount.Should().Be(0);
    }
}
