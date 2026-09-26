namespace Roll6.Application.Realtime;

/// <summary>
/// Which campaign each hub connection follows, and the connections of each user (017). In memory: one API
/// instance is enough for the current scale (no backplane).
/// </summary>
public class TableConnections
{
    private readonly object _lock = new();
    private readonly Dictionary<string, (long UserId, long? CampaignId)> _connections = new();

    public void Add(string connectionId, long userId)
    {
        lock (_lock) _connections[connectionId] = (userId, null);
    }

    public void Remove(string connectionId)
    {
        lock (_lock) _connections.Remove(connectionId);
    }

    /// <summary>Records the campaign followed by the connection and returns the previous one.</summary>
    public long? SetCampaign(string connectionId, long userId, long? campaignId)
    {
        lock (_lock)
        {
            var previous = _connections.TryGetValue(connectionId, out var current) ? current.CampaignId : null;
            _connections[connectionId] = (userId, campaignId);
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

    public static string GroupName(long campaignId) => $"campaign:{campaignId}";
}
