using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

/// <summary>Body of <c>PUT /api/campaign/{id}/gm-mode</c> (096): whether the master's console closes the turns by itself.</summary>
public class CampaignGmModeInfo
{
    [JsonPropertyName("gmMode")]
    public bool GmMode { get; set; }
}
