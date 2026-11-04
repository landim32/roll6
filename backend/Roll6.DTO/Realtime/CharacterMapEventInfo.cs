using System.Text.Json.Serialization;

namespace Roll6.DTO.Realtime;

/// <summary>Data of <see cref="TableEventType.CHARACTER_MAP"/> (108).</summary>
public class CharacterMapEventInfo
{
    [JsonPropertyName("campaignCharacterId")]
    public long CampaignCharacterId { get; set; }

    /// <summary>The map where the character stands now; null = off every map.</summary>
    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }
}
