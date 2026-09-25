using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

public class CampaignInsertInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("open")]
    public bool? Open { get; set; }
}
