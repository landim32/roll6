using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>One entry of a campaign turn: move, action or action result.</summary>
public class TurnInfo
{
    [JsonPropertyName("turnId")]
    public long TurnId { get; set; }

    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }

    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    /// <summary>1 Movement, 2 Action, 3 ActionResult.</summary>
    [JsonPropertyName("turnType")]
    public int TurnType { get; set; }

    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    [JsonPropertyName("npcId")]
    public long? NpcId { get; set; }

    [JsonPropertyName("mapNpcId")]
    public long? MapNpcId { get; set; }

    /// <summary>Character name, or the name of the NPC occurrence (the NPC's when none).</summary>
    [JsonPropertyName("actorName")]
    public string ActorName { get; set; } = string.Empty;

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

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}
