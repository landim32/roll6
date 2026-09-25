using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

public class CampaignInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("ownerName")]
    public string OwnerName { get; set; } = string.Empty;

    [JsonPropertyName("open")]
    public bool Open { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
