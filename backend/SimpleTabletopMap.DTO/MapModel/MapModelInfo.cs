using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.MapModel;

public class MapModelInfo
{
    [JsonPropertyName("mapModelId")]
    public long MapModelId { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("image")]
    public string? Image { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

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

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("changedAt")]
    public DateTime ChangedAt { get; set; }
}
