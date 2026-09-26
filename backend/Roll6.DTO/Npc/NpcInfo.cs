using System.Text.Json.Serialization;

namespace Roll6.DTO.Npc;

public class NpcInfo
{
    [JsonPropertyName("npcId")]
    public long NpcId { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("tokenName")]
    public string TokenName { get; set; } = string.Empty;

    /// <summary>Presigned URL of the token's standing image.</summary>
    [JsonPropertyName("tokenImageUrl")]
    public string? TokenImageUrl { get; set; }

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

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
