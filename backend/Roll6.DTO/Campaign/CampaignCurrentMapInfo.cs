using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

/// <summary>Map the table follows (017); null clears it.</summary>
public class CampaignCurrentMapInfo
{
    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }
}
