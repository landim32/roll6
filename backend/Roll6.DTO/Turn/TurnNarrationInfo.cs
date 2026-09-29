using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>Narration of one turn (029). Several entries of the same turn are already joined.</summary>
public class TurnNarrationInfo
{
    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    [JsonPropertyName("narration")]
    public string Narration { get; set; } = string.Empty;

    /// <summary>UTC time of the last narration entry, without a zone. Null when it belongs to the turn in progress.</summary>
    [JsonPropertyName("finishedAt")]
    public DateTime? FinishedAt { get; set; }
}
