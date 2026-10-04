using System.Text.Json.Serialization;

namespace Roll6.DTO.MapModel;

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

    /// <summary>1 = 2D battle map, 2 = 2.5D story map (033).</summary>
    [JsonPropertyName("kind")]
    public int Kind { get; set; }

    /// <summary>Wall cells as [[x, y], …]; empty when there are none (kept even on a 2D map, where they do nothing).</summary>
    [JsonPropertyName("walls")]
    public List<int[]> Walls { get; set; } = new();

    [JsonPropertyName("skyImage")]
    public string? SkyImage { get; set; }

    /// <summary>Temporary URL of the sky image.</summary>
    [JsonPropertyName("skyImageUrl")]
    public string? SkyImageUrl { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("changedAt")]
    public DateTime ChangedAt { get; set; }
}
