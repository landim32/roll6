namespace Roll6.Application.Realtime;

/// <summary>
/// Which campaign each hub connection follows, and the connections of each user (017). In memory: one API
/// instance is enough for the current scale (no backplane). (043's presence — window and chat on screen — went away in
/// 074: every notice is a push to every device.)
/// </summary>
public class TableConnections
{
    private sealed record Connection(long UserId, long? CampaignId);

    private readonly object _lock = new();
    private readonly Dictionary<string, Connection> _connections = new();
    /// <summary>Walks this connection may relay, until when (069): the permission is checked again every 10 s.</summary>
    private readonly Dictionary<(string ConnectionId, long MapTokenId), DateTime> _walks = new();

    public void Add(string connectionId, long userId)
    {
        lock (_lock) _connections[connectionId] = new Connection(userId, null);
    }

    public void Remove(string connectionId)
    {
        lock (_lock)
        {
            _connections.Remove(connectionId);
            ForgetWalks(connectionId);
        }
    }

    /// <summary>The campaign the connection follows, or null.</summary>
    public long? CampaignOf(string connectionId)
    {
        lock (_lock)
            return _connections.TryGetValue(connectionId, out var current) ? current.CampaignId : null;
    }

    /// <summary>The connection was allowed to walk the piece and the answer still holds (069).</summary>
    public bool IsWalkAllowed(string connectionId, long mapTokenId, DateTime now)
    {
        lock (_lock)
            return _walks.TryGetValue((connectionId, mapTokenId), out var until) && until > now;
    }

    /// <summary>Remembers that the connection may walk the piece until <paramref name="until"/> (069).</summary>
    public void AllowWalk(string connectionId, long mapTokenId, DateTime until)
    {
        lock (_lock) _walks[(connectionId, mapTokenId)] = until;
    }

    private void ForgetWalks(string connectionId)
    {
        foreach (var key in _walks.Keys.Where(k => k.ConnectionId == connectionId).ToList())
            _walks.Remove(key);
    }

    /// <summary>Records the campaign followed by the connection and returns the previous one.</summary>
    public long? SetCampaign(string connectionId, long userId, long? campaignId)
    {
        lock (_lock)
        {
            var previous = _connections.TryGetValue(connectionId, out var current) ? current.CampaignId : null;
            _connections[connectionId] = new Connection(userId, campaignId);
            ForgetWalks(connectionId);
            return previous;
        }
    }

    /// <summary>Connections of the user currently following the campaign.</summary>
    public List<string> ConnectionsOf(long userId, long campaignId)
    {
        lock (_lock)
            return _connections.Where(c => c.Value.UserId == userId && c.Value.CampaignId == campaignId)
                .Select(c => c.Key).ToList();
    }

    /// <summary>Every connection of the user, whatever campaign it follows.</summary>
    public List<string> ConnectionsOfUser(long userId)
    {
        lock (_lock)
            return _connections.Where(c => c.Value.UserId == userId).Select(c => c.Key).ToList();
    }

    public static string GroupName(long campaignId) => $"campaign:{campaignId}";
}
