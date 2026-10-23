using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>101: the master tells the table he started (true) or stopped (false) processing the turn in progress.</summary>
public class TurnProcessingInfo
{
    [JsonPropertyName("processing")]
    public bool Processing { get; set; }

    /// <summary>Why he stopped without closing the turn (optional, ≤ 200 characters; ignored on start).</summary>
    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

/// <summary>The notice after the call: the turn being processed and when the notice expires, or nulls.</summary>
public class TurnProcessingResultInfo
{
    [JsonPropertyName("processingTurn")]
    public int? ProcessingTurn { get; set; }

    /// <summary>UTC instant the notice stops showing without a renewal.</summary>
    [JsonPropertyName("processingUntil")]
    public DateTime? ProcessingUntil { get; set; }

    /// <summary>"gm" when the GM mode is already processing this turn and the start was ignored, else null.</summary>
    [JsonPropertyName("ignored")]
    public string? Ignored { get; set; }
}
