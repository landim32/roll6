using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignPlan;

public class CampaignPlanUpdateInfo
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}
