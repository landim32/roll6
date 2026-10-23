using System.Collections.Concurrent;
using Roll6.Domain.Interfaces;

namespace Roll6.Domain.Turns;

/// <summary>
/// 101: the in-memory notice "the master is processing turn N". An entry counts only while it is the campaign's
/// current turn and younger than <see cref="TIMEOUT"/>, so any path that moves the turn ends it without a hook.
/// </summary>
public class TurnProcessingRegistry : ITurnProcessingRegistry
{
    /// <summary>A notice nobody closes or stops goes away by itself after this long.</summary>
    public static readonly TimeSpan TIMEOUT = TimeSpan.FromMinutes(30);

    private sealed record Entry(int TurnNo, long UserId, DateTime StartedAt);

    private readonly ConcurrentDictionary<long, Entry> _entries = new();

    private static bool IsLive(Entry entry, int currentTurn, DateTime now) =>
        entry.TurnNo == currentTurn && now - entry.StartedAt < TIMEOUT;

    public bool Start(long campaignId, int turnNo, long userId, DateTime now)
    {
        var created = true;
        _entries.AddOrUpdate(campaignId, _ => new Entry(turnNo, userId, now), (_, old) =>
        {
            if (IsLive(old, turnNo, now))
            {
                created = false;
                return old;
            }
            return new Entry(turnNo, userId, now);
        });
        return created;
    }

    public int? Stop(long campaignId, int currentTurn, DateTime now) =>
        _entries.TryRemove(campaignId, out var entry) && IsLive(entry, currentTurn, now) ? entry.TurnNo : null;

    public (int TurnNo, DateTime Until)? Current(long campaignId, int currentTurn, DateTime now)
    {
        if (!_entries.TryGetValue(campaignId, out var entry))
            return null;
        if (IsLive(entry, currentTurn, now))
            return (entry.TurnNo, entry.StartedAt + TIMEOUT);
        _entries.TryRemove(new KeyValuePair<long, Entry>(campaignId, entry));
        return null;
    }

    public void Clear(long campaignId) => _entries.TryRemove(campaignId, out _);
}
