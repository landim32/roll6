using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

public class CampaignInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("ownerName")]
    public string OwnerName { get; set; } = string.Empty;

    [JsonPropertyName("open")]
    public bool Open { get; set; }

    /// <summary>1 Preparando, 2 Ativa, 3 Pausada, 4 Finalizada (049). Only an active campaign plays.</summary>
    [JsonPropertyName("status")]
    public int Status { get; set; }

    [JsonPropertyName("currentTurn")]
    public int CurrentTurn { get; set; }

    /// <summary>Free mode (054): several valid actions per actor, unlimited unrecorded moves, no pending list.</summary>
    [JsonPropertyName("freeMode")]
    public bool FreeMode { get; set; }

    /// <summary>Pending notice over the chat (072): the pictures of who still owes a play. On by default.</summary>
    [JsonPropertyName("pendingNotice")]
    public bool PendingNotice { get; set; } = true;

    /// <summary>Map the master opened last; players follow it (017).</summary>
    [JsonPropertyName("currentMapId")]
    public long? CurrentMapId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Unique URL slug. Set on creation and never changed.</summary>
    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
