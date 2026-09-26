using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>Finished, or the characters that still have to act.</summary>
public class TurnFinishResultInfo
{
    [JsonPropertyName("finished")]
    public bool Finished { get; set; }

    [JsonPropertyName("pending")]
    public List<string> Pending { get; set; } = new();

    [JsonPropertyName("finishedTurn")]
    public int? FinishedTurn { get; set; }

    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }
}
