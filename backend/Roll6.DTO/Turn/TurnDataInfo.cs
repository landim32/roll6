using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>
/// The whole table for an AI assistant in one call (027): approved characters, NPC occurrences of the current map and
/// the "## Ações" markdown of the turn.
/// </summary>
public class TurnDataInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    /// <summary>Turn whose actions are listed.</summary>
    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    /// <summary>Turn in progress of the campaign.</summary>
    [JsonPropertyName("currentTurn")]
    public int CurrentTurn { get; set; }

    /// <summary>Current map of the campaign (positions and NPCs), null when none.</summary>
    [JsonPropertyName("mapId")]
    public long? MapId { get; set; }

    [JsonPropertyName("characters")]
    public List<TurnDataCharacterInfo> Characters { get; set; } = new();

    [JsonPropertyName("npcs")]
    public List<TurnDataNpcInfo> Npcs { get; set; } = new();

    /// <summary>Same text as the "## Ações" section of the turn summary.</summary>
    [JsonPropertyName("actions")]
    public string Actions { get; set; } = string.Empty;
}

/// <summary>An approved character of the campaign (energy is the fatigue).</summary>
public class TurnDataCharacterInfo
{
    [JsonPropertyName("characterId")]
    public long CharacterId { get; set; }

    [JsonPropertyName("campaignCharacterId")]
    public long CampaignCharacterId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Name of the player who owns the character.</summary>
    [JsonPropertyName("playerName")]
    public string PlayerName { get; set; } = string.Empty;

    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    [JsonPropertyName("totalLife")]
    public int TotalLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }

    [JsonPropertyName("totalEnergy")]
    public int TotalEnergy { get; set; }

    /// <summary>Movement points the character may spend per turn on this campaign's maps (Deslocamento, 037).</summary>
    [JsonPropertyName("currentMove")]
    public int CurrentMove { get; set; }

    /// <summary>The character's permanent move (where the Deslocamento starts from).</summary>
    [JsonPropertyName("move")]
    public int Move { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    /// <summary>1 standing ("Em pé"), 2 down ("Caído"), 3 out of combat ("Fora de combate") (031).</summary>
    [JsonPropertyName("posture")]
    public int Posture { get; set; } = 1;

    /// <summary>Piece on the current map (null without one).</summary>
    [JsonPropertyName("mapTokenId")]
    public long? MapTokenId { get; set; }

    [JsonPropertyName("x")]
    public int? X { get; set; }

    [JsonPropertyName("y")]
    public int? Y { get; set; }

    /// <summary>Side faced, 0–5 clockwise from the top.</summary>
    [JsonPropertyName("look")]
    public int? Look { get; set; }

    /// <summary>Norte, Nordeste, Sudeste, Sul, Sudoeste or Noroeste.</summary>
    [JsonPropertyName("lookName")]
    public string? LookName { get; set; }
}

/// <summary>An NPC occurrence on the current map (totals are the NPC's).</summary>
public class TurnDataNpcInfo
{
    [JsonPropertyName("mapNpcId")]
    public long MapNpcId { get; set; }

    [JsonPropertyName("npcId")]
    public long NpcId { get; set; }

    [JsonPropertyName("mapTokenId")]
    public long? MapTokenId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    [JsonPropertyName("totalLife")]
    public int TotalLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }

    [JsonPropertyName("totalEnergy")]
    public int TotalEnergy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    /// <summary>1 standing ("Em pé"), 2 down ("Caído"), 3 out of combat ("Fora de combate") (031).</summary>
    [JsonPropertyName("posture")]
    public int Posture { get; set; } = 1;

    [JsonPropertyName("x")]
    public int? X { get; set; }

    [JsonPropertyName("y")]
    public int? Y { get; set; }

    [JsonPropertyName("look")]
    public int? Look { get; set; }

    [JsonPropertyName("lookName")]
    public string? LookName { get; set; }
}
