using Roll6.DTO.Realtime;

namespace Roll6.Domain.Realtime;

public enum TableEventAudienceKind
{
    /// <summary>Everyone in the campaign group.</summary>
    Everyone = 1,

    /// <summary>The master and the owners of the characters standing on the event's map.</summary>
    Map = 2
}

/// <summary>
/// Who receives a table event (108 FR-015): players see only the map where their character stands, so the pieces, NPCs
/// and paint of a map go to the master and to who has a character there. Every other event, and a reload of every map
/// (null map), still goes to the whole campaign. The REST API is unchanged.
/// </summary>
public static class TableEventAudience
{
    private static readonly HashSet<string> MAP_EVENTS = new()
    {
        TableEventType.MAP_TOKEN_UPSERTED,
        TableEventType.MAP_TOKEN_DELETED,
        TableEventType.MAP_TOKENS_CHANGED,
        // 107: the paint of a map follows its pieces.
        TableEventType.MAP_PAINT_CHANGED
    };

    /// <summary>True when the audience depends on who stands on the map (a piece or paint event of one map).</summary>
    public static bool IsMapEvent(string type, long? mapId) => mapId.HasValue && MAP_EVENTS.Contains(type);

    public static TableEventAudienceKind For(TableEventInfo tableEvent) =>
        IsMapEvent(tableEvent.Type, tableEvent.MapId) ? TableEventAudienceKind.Map : TableEventAudienceKind.Everyone;
}
