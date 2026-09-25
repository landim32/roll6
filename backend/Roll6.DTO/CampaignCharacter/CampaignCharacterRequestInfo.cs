using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

public class CampaignCharacterRequestInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("characterId")]
    public long CharacterId { get; set; }
}
