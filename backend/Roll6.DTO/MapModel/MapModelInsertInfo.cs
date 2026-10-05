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

    /// <summary>3D mask (034): black = wall, white = empty; same proportion as the map image. Null = none.</summary>
    [JsonPropertyName("maskImage")]
    public string? MaskImage { get; set; }

    /// <summary>Background of the 3D view ({guid}.{ext}); null = none.</summary>
    [JsonPropertyName("backgroundImage")]
    public string? BackgroundImage { get; set; }

    /// <summary>Texture that covers every wall of the 3D view ({guid}.{ext}); null = the walls keep the map's colors (036).</summary>
    [JsonPropertyName("wallTextureImage")]
    public string? WallTextureImage { get; set; }
}
