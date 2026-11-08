using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

/// <summary>Takes a character or NPC piece to another map of the same campaign (111).</summary>
public class MapTokenMapInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }
}
