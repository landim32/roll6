using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.Image;

public class ImageUploadInfo
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }
}
