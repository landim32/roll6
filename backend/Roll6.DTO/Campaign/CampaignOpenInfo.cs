using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

public class CampaignOpenInfo
{
    [JsonPropertyName("open")]
    public bool Open { get; set; }
}
