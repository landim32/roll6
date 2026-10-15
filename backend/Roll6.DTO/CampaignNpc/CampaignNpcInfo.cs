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

    /// <summary>Active instances of the NPC across the campaign's maps (051): how many pieces "Retirar da campanha" removes.</summary>
    [JsonPropertyName("mapNpcCount")]
    public int MapNpcCount { get; set; }

    /// <summary>1 Inimigo, 2 Neutro, 3 Aliado (071): the panel the NPC shows in and whether it may have a master.</summary>
    [JsonPropertyName("category")]
    public int Category { get; set; } = 1;

    /// <summary>The ally's master participation (071); null when none or no longer approved.</summary>
    [JsonPropertyName("masterCampaignCharacterId")]
    public long? MasterCampaignCharacterId { get; set; }

    /// <summary>The character of that participation.</summary>
    [JsonPropertyName("masterCharacterId")]
    public long? MasterCharacterId { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}
