using System.Text.Json.Serialization;

namespace Roll6.DTO.MapModel;

public class MapModelInsertInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("image")]
    public string? Image { get; set; }

    [JsonPropertyName("gridWidth")]
    public int? GridWidth { get; set; }

    [JsonPropertyName("gridHeight")]
    public int? GridHeight { get; set; }

    [JsonPropertyName("imageWidth")]
    public int? ImageWidth { get; set; }

    [JsonPropertyName("imageHeight")]
    public int? ImageHeight { get; set; }

    [JsonPropertyName("imageTop")]
    public int? ImageTop { get; set; }

    [JsonPropertyName("imageLeft")]
    public int? ImageLeft { get; set; }

    /// <summary>1 = 2D battle map (default), 2 = 2.5D story map (033).</summary>
    [JsonPropertyName("kind")]
    public int? Kind { get; set; }

    /// <summary>Wall cells as [[x, y], …] (column/row, odd-q); null/empty = none.</summary>
    [JsonPropertyName("walls")]
    public List<int[]>? Walls { get; set; }

    /// <summary>Sky/horizon image of the 3D view ({guid}.{ext}); null = none.</summary>
    [JsonPropertyName("skyImage")]
    public string? SkyImage { get; set; }
}
