using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.Token;

public class TokenInfo
{
    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("upSpace")]
    public int UpSpace { get; set; }

    [JsonPropertyName("downSpace")]
    public int? DownSpace { get; set; }

    [JsonPropertyName("upImage")]
    public string? UpImage { get; set; }

    [JsonPropertyName("upImageUrl")]
    public string? UpImageUrl { get; set; }

    [JsonPropertyName("downImage")]
    public string? DownImage { get; set; }

    [JsonPropertyName("downImageUrl")]
    public string? DownImageUrl { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
