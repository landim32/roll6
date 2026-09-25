using System.Text.Json.Serialization;

namespace Roll6.DTO.Map;

public class MapInsertInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("mapModelId")]
    public long MapModelId { get; set; }
}
