using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

/// <summary>Campaign shown in the table combo, with the map players currently follow when it is active.</summary>
public class CampaignTableInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    /// <summary>Campaign name.</summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Immutable URL slug of the campaign.</summary>
    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;

    /// <summary>True when the current user is the master.</summary>
    [JsonPropertyName("isMaster")]
    public bool IsMaster { get; set; }

    /// <summary>Active map the table follows. Null when there is none or it is not active.</summary>
    [JsonPropertyName("currentMapId")]
    public long? CurrentMapId { get; set; }

    /// <summary>Name of <see cref="CurrentMapId"/>. Null when there is no active current map.</summary>
    [JsonPropertyName("currentMapName")]
    public string? CurrentMapName { get; set; }

    /// <summary>Slug of <see cref="CurrentMapId"/>. Null when there is no active current map.</summary>
    [JsonPropertyName("currentMapSlug")]
    public string? CurrentMapSlug { get; set; }
}
