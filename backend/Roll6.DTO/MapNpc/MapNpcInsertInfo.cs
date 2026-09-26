using System.Text.Json.Serialization;

namespace Roll6.DTO.MapNpc;

/// <summary>New occurrence of a campaign NPC on a map, placed on a free hex (column/row, odd-q).</summary>
public class MapNpcInsertInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("npcId")]
    public long NpcId { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("look")]
    public int? Look { get; set; }
}
