using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

/// <summary>Body of <c>PUT /api/campaign/{id}/free-mode</c> (054): the new value of the campaign's free mode.</summary>
public class CampaignFreeModeInfo
{
    [JsonPropertyName("freeMode")]
    public bool FreeMode { get; set; }
}
