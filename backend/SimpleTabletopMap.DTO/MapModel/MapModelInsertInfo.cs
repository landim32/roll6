using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.MapModel;

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
}
