using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.Map;

public class MapInsertInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("mapModelId")]
    public long MapModelId { get; set; }
}
