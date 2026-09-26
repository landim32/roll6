using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignNpc;

public class CampaignNpcInsertInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("npcId")]
    public long NpcId { get; set; }
}
