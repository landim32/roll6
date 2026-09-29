using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

public class TurnSetCurrentResultInfo
{
    [JsonPropertyName("previousTurn")]
    public int PreviousTurn { get; set; }

    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    /// <summary>Entries of later turns deleted by discardLaterEntries.</summary>
    [JsonPropertyName("discardedEntries")]
    public int DiscardedEntries { get; set; }
}
