using System.Text.Json.Serialization;

namespace Roll6.DTO.Npc;

public class NpcInsertInfo
{
    /// <summary>Library token of the NPC's pieces (required).</summary>
    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    [JsonPropertyName("move")]
    public int Move { get; set; }

    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    [JsonPropertyName("image")]
    public string? Image { get; set; }
}
