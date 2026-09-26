using Roll6.DTO.Realtime;

namespace Roll6.Domain.Realtime;

/// <summary>Builds the table events published by the domain services (017).</summary>
public static class TableEvents
{
    public static TableEventInfo Create(string type, long campaignId, long actorUserId, long? mapId = null, object? data = null) => new()
    {
        Type = type,
        CampaignId = campaignId,
        MapId = mapId,
        ActorUserId = actorUserId,
        Data = data
    };
}
