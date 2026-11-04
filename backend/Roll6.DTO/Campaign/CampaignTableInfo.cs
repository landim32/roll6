using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

/// <summary>Campaign shown in the table combo, with the maps the caller may open from it.</summary>
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

    /// <summary>Presigned URL of the campaign's picture (090); null without one.</summary>
    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("isMaster")]
    public bool IsMaster { get; set; }

    /// <summary>
    /// 078/108: the active maps by name. The master gets all of them with every character; a player only the maps of his
    /// characters, with only those. Feeds the table combo.
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

    /// <summary>1 Active.</summary>
    [JsonPropertyName("status")]
    public int Status { get; set; }

    /// <summary>Characters on the map (108), only the caller's own for a player: <see cref="CharacterIds"/> counted.</summary>
    [JsonPropertyName("characterCount")]
    public int CharacterCount { get; set; }

    /// <summary>Characters (characterId) on the map, only the caller's own for a player.</summary>
    [JsonPropertyName("characterIds")]
    public List<long> CharacterIds { get; set; } = new();
}
