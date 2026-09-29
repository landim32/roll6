using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>
/// Direct entry created by the master in any turn up to the current one (the only way to create action results;
/// 030: also character updates and narrations).
/// </summary>
public class TurnInsertInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }

    /// <summary>Turn number; the current turn when omitted.</summary>
    [JsonPropertyName("turnNo")]
    public int? TurnNo { get; set; }

    /// <summary>1 Movement, 2 Action, 3 ActionResult, 4 CharacterUpdate, 5 Narration (no actor).</summary>
    [JsonPropertyName("turnType")]
    public int TurnType { get; set; }

    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    [JsonPropertyName("npcId")]
    public long? NpcId { get; set; }

    [JsonPropertyName("mapNpcId")]
    public long? MapNpcId { get; set; }

    [JsonPropertyName("beforeX")]
    public int? BeforeX { get; set; }

    [JsonPropertyName("beforeY")]
    public int? BeforeY { get; set; }

    [JsonPropertyName("beforeLook")]
    public int? BeforeLook { get; set; }

    [JsonPropertyName("x")]
    public int? X { get; set; }

    [JsonPropertyName("y")]
    public int? Y { get; set; }

    [JsonPropertyName("look")]
    public int? Look { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>Movement only: movement points spent (optional, ≥ 0).</summary>
    [JsonPropertyName("moved")]
    public int? Moved { get; set; }

    /// <summary>CharacterUpdate only: the fields that changed (required, at least one).</summary>
    [JsonPropertyName("changes")]
    public List<TurnChangeInfo>? Changes { get; set; }
}
