using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.Campaign;

public class CampaignOpenInfo
{
    [JsonPropertyName("open")]
    public bool Open { get; set; }
}
