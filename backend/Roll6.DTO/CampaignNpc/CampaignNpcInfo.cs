using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignNpc;

/// <summary>An NPC available in a campaign, with the NPC's data (master only).</summary>
public class CampaignNpcInfo
{
    [JsonPropertyName("campaignNpcId")]
    public long CampaignNpcId { get; set; }

    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("npcId")]
    public long NpcId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("tokenImageUrl")]
    public string? TokenImageUrl { get; set; }

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    [JsonPropertyName("move")]
    public int Move { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}
