using System.Text.Json.Serialization;

namespace Roll6.DTO.Image;

/// <summary>Result of POST /api/document (022): an image or PDF stored exactly as sent.</summary>
public class DocumentUploadInfo
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    /// <summary>"image" or "pdf".</summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;
}
