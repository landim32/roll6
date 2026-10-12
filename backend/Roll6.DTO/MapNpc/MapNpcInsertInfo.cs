using System.Text.Json.Serialization;

namespace Roll6.DTO.MapNpc;

/// <summary>
/// New occurrence of a campaign NPC on a map, placed on a free hex (column/row, odd-q). Without <see cref="X"/> and
/// <see cref="Y"/> the server takes the free hex nearest to the middle of the map (052).
/// </summary>
public class MapNpcInsertInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("npcId")]
    public long NpcId { get; set; }

    /// <summary>Column; omit (with <see cref="Y"/>) to let the server choose a free hex.</summary>
    [JsonPropertyName("x")]
    public int? X { get; set; }

    /// <summary>Row; omit (with <see cref="X"/>) to let the server choose a free hex.</summary>
    [JsonPropertyName("y")]
    public int? Y { get; set; }

    [JsonPropertyName("look")]
    public int? Look { get; set; }
}
