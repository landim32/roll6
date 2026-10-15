namespace Roll6.Domain.Notifications;

/// <summary>
/// How Web Pushes are delivered (074): every push is urgent and lives 12 hours at the push service; the outbox retries
/// a failed delivery a few times; a device that fails <see cref="MAX_FAILURES"/> times in a row is skipped until a
/// test (or a new registration) brings it back.
/// </summary>
public static class PushPolicy
{
    /// <summary>Consecutive failed deliveries after which a device is skipped.</summary>
    public const int MAX_FAILURES = 5;

    /// <summary>How long a push stays valid, at the push service and in the outbox.</summary>
    public static readonly TimeSpan TTL = TimeSpan.FromHours(12);

    /// <summary>Waits before the 2nd, 3rd and 4th attempts; the 4th failure gives up.</summary>
    public static readonly IReadOnlyList<TimeSpan> RETRY = new[]
    {
        TimeSpan.FromSeconds(30),
        TimeSpan.FromMinutes(2),
        TimeSpan.FromMinutes(10)
    };

    /// <summary>Pushes in flight at once (never two for the same device).</summary>
    public const int PARALLEL = 8;

    /// <summary>How long one push request may take.</summary>
    public static readonly TimeSpan SEND_TIMEOUT = TimeSpan.FromSeconds(10);
}
