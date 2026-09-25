using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.Map;

public class MapInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("mapModelId")]
    public long MapModelId { get; set; }

    [JsonPropertyName("mapModelName")]
    public string MapModelName { get; set; } = string.Empty;

    [JsonPropertyName("mapModelImageUrl")]
    public string? MapModelImageUrl { get; set; }

    [JsonPropertyName("gridWidth")]
    public int GridWidth { get; set; }

    [JsonPropertyName("gridHeight")]
    public int GridHeight { get; set; }

    [JsonPropertyName("imageWidth")]
    public int? ImageWidth { get; set; }

    [JsonPropertyName("imageHeight")]
    public int? ImageHeight { get; set; }

    [JsonPropertyName("imageTop")]
    public int ImageTop { get; set; }

    [JsonPropertyName("imageLeft")]
    public int ImageLeft { get; set; }

    /// <summary>Fixed hex size (px) of every grid.</summary>
    [JsonPropertyName("hexSize")]
    public int HexSize { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("sequence")]
    public int Sequence { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
