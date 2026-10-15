using Roll6.Application.Notifications;

namespace Roll6.Application.Realtime;

/// <summary>
/// Which campaign each hub connection follows, and the connections of each user (017). In memory: one API
/// instance is enough for the current scale (no backplane). Since 043 it also knows, per connection, whether the
/// window is on screen and the chat visible (<see cref="IPresence"/>), as the client reports through the hub.
/// </summary>
public class TableConnections : IPresence
{
    private sealed record Connection(long UserId, long? CampaignId, bool Visible, bool ChatVisible);

    private readonly object _lock = new();
    private readonly Dictionary<string, Connection> _connections = new();
    /// <summary>Walks this connection may relay, until when (069): the permission is checked again every 10 s.</summary>
    private readonly Dictionary<(string ConnectionId, long MapTokenId), DateTime> _walks = new();

    public void Add(string connectionId, long userId)
    {
        lock (_lock) _connections[connectionId] = new Connection(userId, null, false, false);
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

    /// <summary>
    /// Records the campaign followed by the connection and returns the previous one. A new campaign starts on screen
    /// with the chat hidden until the client reports otherwise.
    /// </summary>
    public long? SetCampaign(string connectionId, long userId, long? campaignId)
    {
        lock (_lock)
        {
            var previous = _connections.TryGetValue(connectionId, out var current) ? current.CampaignId : null;
            _connections[connectionId] = new Connection(userId, campaignId, campaignId != null, false);
            ForgetWalks(connectionId);
            return previous;
        }
    }

    /// <summary>The window is on screen / the chat is visible on this connection (043). Ignored while not joined.</summary>
    public void SetPresence(string connectionId, bool visible, bool chatVisible)
    {
        lock (_lock)
        {
            if (_connections.TryGetValue(connectionId, out var current) && current.CampaignId != null)
                _connections[connectionId] = current with { Visible = visible, ChatVisible = visible && chatVisible };
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

    public bool IsChatVisible(long userId, long campaignId)
    {
        lock (_lock)
            return _connections.Values.Any(c => c.UserId == userId && c.CampaignId == campaignId && c.Visible && c.ChatVisible);
    }

    public bool IsCampaignVisible(long userId, long campaignId)
    {
        lock (_lock)
            return _connections.Values.Any(c => c.UserId == userId && c.CampaignId == campaignId && c.Visible);
    }

    public static string GroupName(long campaignId) => $"campaign:{campaignId}";
}
