using Roll6.Domain.Notifications;

namespace Roll6.Domain.Models;

/// <summary>
/// One push still to be delivered to one device (074, the durable outbox): written by the notification dispatcher,
/// drained by the delivery worker, deleted once sent, gone, expired or out of attempts — so a restart loses nothing.
/// </summary>
public class PushDelivery
{
    public const int MAX_PAYLOAD = 4000;
    public const int MAX_TOPIC = 32;

    public long PushDeliveryId { get; set; }
    public long PushSubscriptionId { get; set; }
    public string Payload { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public int Attempts { get; set; }
    public DateTime NextAttemptAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public static PushDelivery Create(long pushSubscriptionId, string payload, string topic, DateTime now) => new()
    {
        PushSubscriptionId = pushSubscriptionId,
        Payload = payload,
        Topic = topic.Length <= MAX_TOPIC ? topic : topic[..MAX_TOPIC],
        CreatedAt = now,
        NextAttemptAt = now,
        ExpiresAt = now + PushPolicy.TTL
    };

    public bool IsExpired(DateTime now) => now >= ExpiresAt;

    /// <summary>What is left of the push's life, for the push service's TTL (at least one second).</summary>
    public TimeSpan TimeToLive(DateTime now) => ExpiresAt - now > TimeSpan.FromSeconds(1) ? ExpiresAt - now : TimeSpan.FromSeconds(1);

    /// <summary>
    /// A failed attempt: schedules the next one and answers true, or answers false when the attempts are over or the
    /// next one would come after the push expired (the row is then dropped).
    /// </summary>
    public bool Failed(DateTime now)
    {
        if (Attempts >= PushPolicy.RETRY.Count)
            return false;
        var next = now + PushPolicy.RETRY[Attempts];
        if (next >= ExpiresAt)
            return false;
        Attempts++;
        NextAttemptAt = next;
        return true;
    }
}
