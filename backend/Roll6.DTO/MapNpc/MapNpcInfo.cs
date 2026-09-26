using System.Text.Json.Serialization;

namespace Roll6.DTO.MapNpc;

/// <summary>An NPC occurrence on a map with its piece (position and token).</summary>
public class MapNpcInfo
{
    [JsonPropertyName("mapNpcId")]
    public long MapNpcId { get; set; }

    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("npcId")]
    public long NpcId { get; set; }

    [JsonPropertyName("mapTokenId")]
    public long? MapTokenId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("tokenId")]
    public long? TokenId { get; set; }

    [JsonPropertyName("tokenImageUrl")]
    public string? TokenImageUrl { get; set; }

    [JsonPropertyName("x")]
    public int? X { get; set; }

    [JsonPropertyName("y")]
    public int? Y { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
