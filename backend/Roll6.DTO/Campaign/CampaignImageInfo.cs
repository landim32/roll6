using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

/// <summary>Sets the campaign's picture (090, master only): a name from <c>POST /api/image</c>; null or empty removes it.</summary>
public class CampaignImageInfo
{
    [JsonPropertyName("image")]
    public string? Image { get; set; }
}
