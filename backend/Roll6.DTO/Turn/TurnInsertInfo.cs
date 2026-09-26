using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>Direct entry created by the master (the only way to create action results).</summary>
public class TurnInsertInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }

    /// <summary>Turn number; the current turn when omitted.</summary>
    [JsonPropertyName("turnNo")]
    public int? TurnNo { get; set; }

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
}
