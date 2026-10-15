using System.Text.Json.Serialization;

namespace Roll6.DTO.Realtime;

/// <summary>
/// One sample of a free-mode walk (069), sent by the walker through the hub method <c>Walk</c> about ten times a second
/// while it moves or turns, plus one with <see cref="Moving"/> false when it stops. Never stored: the piece's hex and
/// facing are written through <c>PUT /api/maptoken/{id}/position</c> with <c>walk</c>.
/// </summary>
public class WalkInfo
{
    [JsonPropertyName("mapTokenId")]
    public long MapTokenId { get; set; }

    /// <summary>Exact position in map pixels.</summary>
    [JsonPropertyName("x")]
    public double X { get; set; }

    /// <summary>Exact position in map pixels (the map's y).</summary>
    [JsonPropertyName("z")]
    public double Z { get; set; }

    /// <summary>Facing in radians: 0 = north, growing clockwise.</summary>
    [JsonPropertyName("yaw")]
    public double Yaw { get; set; }

    /// <summary>True while walking or turning; false on the last sample.</summary>
    [JsonPropertyName("moving")]
    public bool Moving { get; set; }
}

/// <summary>A walk sample relayed to the other connections of the campaign (hub method <c>walk</c>, 069).</summary>
public class WalkMessageInfo : WalkInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    /// <summary>The walker.</summary>
    [JsonPropertyName("userId")]
    public long UserId { get; set; }
}
