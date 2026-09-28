using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>
/// The result of a turn decided by an AI assistant (027): changes to characters and NPC occurrences plus the
/// narration. Saved all at once, then the turn is finished.
/// </summary>
public class TurnProcessInfo
{
    [JsonPropertyName("characters")]
    public List<TurnProcessCharacterInfo> Characters { get; set; } = new();

    [JsonPropertyName("npcs")]
    public List<TurnProcessNpcInfo> Npcs { get; set; } = new();

    /// <summary>What happened in the turn (up to 10000 characters).</summary>
    [JsonPropertyName("narration")]
    public string? Narration { get; set; }
}

/// <summary>Fields left null keep their value.</summary>
public abstract class TurnProcessPieceInfo
{
    [JsonPropertyName("currentLife")]
    public int? CurrentLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int? CurrentEnergy { get; set; }

    /// <summary>New status; to erase it use clearStatus.</summary>
    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("clearStatus")]
    public bool ClearStatus { get; set; }

    /// <summary>New column (together with y).</summary>
    [JsonPropertyName("x")]
    public int? X { get; set; }

    /// <summary>New row (together with x).</summary>
    [JsonPropertyName("y")]
    public int? Y { get; set; }

    /// <summary>New facing, 0–5 clockwise from the top.</summary>
    [JsonPropertyName("look")]
    public int? Look { get; set; }
}

public class TurnProcessCharacterInfo : TurnProcessPieceInfo
{
    [JsonPropertyName("characterId")]
    public long CharacterId { get; set; }
}

public class TurnProcessNpcInfo : TurnProcessPieceInfo
{
    [JsonPropertyName("mapNpcId")]
    public long MapNpcId { get; set; }
}

/// <summary>Answer of the processing: the finished turn, the new one and the data of the processed turn.</summary>
public class TurnProcessResultInfo
{
    [JsonPropertyName("finishedTurn")]
    public int FinishedTurn { get; set; }

    /// <summary>Turn in progress after the call.</summary>
    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    [JsonPropertyName("data")]
    public TurnDataInfo Data { get; set; } = new();
}
