using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.CampaignCharacter;

public class CampaignCharacterRequestInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("characterId")]
    public long CharacterId { get; set; }
}
