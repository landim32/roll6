using System.Text.Json.Serialization;

namespace Roll6.DTO.Image;

/// <summary>Result of POST /api/model (055): a glTF binary (.glb) stored exactly as sent.</summary>
public class ModelUploadInfo
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }
}
