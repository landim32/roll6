namespace Roll6.Tests;

/// <summary>A clock the test moves by hand (074 push outbox).</summary>
public sealed class TestClock : TimeProvider
{
    public TestClock(DateTime utcNow) => Now = utcNow;

    public DateTime Now { get; set; }

    public override DateTimeOffset GetUtcNow() => new(DateTime.SpecifyKind(Now, DateTimeKind.Utc));
}
