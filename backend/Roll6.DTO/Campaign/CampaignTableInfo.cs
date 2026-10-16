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
    /// <summary>Campaign status (049): 1 Preparando, 2 Ativa, 3 Pausada, 4 Finalizada.</summary>
    [JsonPropertyName("status")]
    public int Status { get; set; }

    /// <summary>Free mode of the campaign (054).</summary>
    [JsonPropertyName("freeMode")]
    public bool FreeMode { get; set; }

    /// <summary>Pending notice over the chat (072).</summary>
    [JsonPropertyName("pendingNotice")]
    public bool PendingNotice { get; set; } = true;

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

    /// <summary>
    /// 078: the Current and Active maps of the campaign, Current first then by name — only for campaigns the caller
    /// masters (empty for players, who only follow the current map). Feeds the master's table combo.
    /// </summary>
    [JsonPropertyName("maps")]
    public List<TableMapInfo> Maps { get; set; } = new();
}

/// <summary>A map in the table combo (078).</summary>
public class TableMapInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;

    /// <summary>1 Active, 4 Current.</summary>
    [JsonPropertyName("status")]
    public int Status { get; set; }
}
