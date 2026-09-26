using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignPlan;

/// <summary>One entry of a campaign plan in lists (without the description).</summary>
public class CampaignPlanInfo
{
    [JsonPropertyName("campaignPlanId")]
    public long CampaignPlanId { get; set; }

    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("changedAt")]
    public DateTime ChangedAt { get; set; }
}
