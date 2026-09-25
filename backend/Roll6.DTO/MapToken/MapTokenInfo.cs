using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

public class MapTokenInfo
{
    [JsonPropertyName("mapTokenId")]
    public long MapTokenId { get; set; }

    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("tokenName")]
    public string TokenName { get; set; } = string.Empty;

    [JsonPropertyName("upImageUrl")]
    public string? UpImageUrl { get; set; }

    [JsonPropertyName("downImageUrl")]
    public string? DownImageUrl { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tokenType")]
    public int TokenType { get; set; }

    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("move")]
    public int Move { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("look")]
    public int Look { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
