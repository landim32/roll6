using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

public class CampaignInsertInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("open")]
    public bool? Open { get; set; }

    /// <summary>The campaign's picture (090): a name returned by <c>POST /api/image</c>; optional.</summary>
    [JsonPropertyName("image")]
    public string? Image { get; set; }
}
