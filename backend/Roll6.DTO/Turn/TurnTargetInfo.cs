using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>
/// What an action is about (098, "Ação sobre…"), as it was when the action was declared: the hex, the distance in
/// hexes from the actor's piece and, when a piece covered the hex, that piece's identity and what the table showed of
/// it (never re-read afterwards). Null on an action without a target and on a whispered action masked for the reader.
/// </summary>
public class TurnTargetInfo
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    /// <summary>Hexes from the actor's piece to the target hex.</summary>
    [JsonPropertyName("distance")]
    public int Distance { get; set; }

    /// <summary>The piece that covered the hex; null = empty hex (every field below is null too).</summary>
    [JsonPropertyName("mapTokenId")]
    public long? MapTokenId { get; set; }

    /// <summary>character | npc | object.</summary>
    [JsonPropertyName("kind")]
    public string? Kind { get; set; }

    /// <summary>"personagem", "NPC" or "objeto".</summary>
    [JsonPropertyName("kindLabel")]
    public string? KindLabel { get; set; }

    /// <summary>self (the actor's own piece) | ally (characters, ally NPCs) | enemy | neutral | object.</summary>
    [JsonPropertyName("side")]
    public string? Side { get; set; }

    /// <summary>"si mesmo", "aliado", "inimigo", "neutro" or "objeto".</summary>
    [JsonPropertyName("sideLabel")]
    public string? SideLabel { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    [JsonPropertyName("mapNpcId")]
    public long? MapNpcId { get; set; }

    [JsonPropertyName("look")]
    public int? Look { get; set; }

    [JsonPropertyName("lookName")]
    public string? LookName { get; set; }

    /// <summary>1 Em pé, 2 Caído, 3 Fora de combate.</summary>
    [JsonPropertyName("posture")]
    public int? Posture { get; set; }

    [JsonPropertyName("postureLabel")]
    public string? PostureLabel { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("currentLife")]
    public int? CurrentLife { get; set; }

    [JsonPropertyName("totalLife")]
    public int? TotalLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int? CurrentEnergy { get; set; }

    [JsonPropertyName("totalEnergy")]
    public int? TotalEnergy { get; set; }

    /// <summary>The target as the summary line says it, e.g. "Goblin (inimigo, NPC) em (9, 7), a 3 hexes, …".</summary>
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}
