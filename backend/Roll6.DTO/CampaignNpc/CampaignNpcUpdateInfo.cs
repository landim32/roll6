using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignNpc;

/// <summary>Category of an NPC in a campaign and, for allies, its master character (071).</summary>
public class CampaignNpcUpdateInfo
{
    /// <summary>1 Inimigo (enemy), 2 Neutro (neutral), 3 Aliado (ally).</summary>
    [JsonPropertyName("category")]
    public int Category { get; set; }

    /// <summary>An approved participation of the same campaign whose owner commands the ally; only for allies. Null = none.</summary>
    [JsonPropertyName("masterCampaignCharacterId")]
    public long? MasterCampaignCharacterId { get; set; }
}
