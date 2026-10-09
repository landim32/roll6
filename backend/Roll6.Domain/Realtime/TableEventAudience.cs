using Roll6.DTO.Realtime;

namespace Roll6.Domain.Realtime;

public enum TableEventAudienceKind
{
    /// <summary>Everyone in the campaign group.</summary>
    Everyone = 1,

    /// <summary>Only the campaign master's connections.</summary>
    MasterOnly = 2
}

/// <summary>
/// Who receives a table event (039 FR-010): players see only the campaign's current map, so the pieces and NPCs of
/// any other map (the next dungeon the master is preparing) go only to the master. Every other event, and a reload of
/// every map (null map), still goes to the whole campaign. The REST API is unchanged (FR-009).
/// </summary>
public static class TableEventAudience
{
    private static readonly HashSet<string> PIECE_EVENTS = new()
    {
        TableEventType.MAP_TOKEN_UPSERTED,
        TableEventType.MAP_TOKEN_DELETED,
        TableEventType.MAP_TOKENS_CHANGED
    };

    /// <summary>True when the audience depends on the campaign's current map (a piece event of one map).</summary>
    public static bool NeedsCampaign(string type, long? mapId) => mapId.HasValue && PIECE_EVENTS.Contains(type);

    public static TableEventAudienceKind For(TableEventInfo tableEvent, long? currentMapId) =>
        NeedsCampaign(tableEvent.Type, tableEvent.MapId) && tableEvent.MapId != currentMapId
            ? TableEventAudienceKind.MasterOnly
            : TableEventAudienceKind.Everyone;
}
