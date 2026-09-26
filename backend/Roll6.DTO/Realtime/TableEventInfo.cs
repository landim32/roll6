using System.Text.Json.Serialization;

namespace Roll6.DTO.Realtime;

/// <summary>Real-time event sent to every connection of a campaign after a successful change (017).</summary>
public class TableEventInfo
{
    /// <summary>One of the <see cref="TableEventType"/> values.</summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    /// <summary>Map affected, when the change belongs to one.</summary>
    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }

    /// <summary>User who made the change.</summary>
    [JsonPropertyName("actorUserId")]
    public long ActorUserId { get; set; }

    /// <summary>Type-specific payload (a DTO or a small anonymous object), or null.</summary>
    [JsonPropertyName("data")]
    public object? Data { get; set; }
}
