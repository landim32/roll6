using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>Sets the turn in progress directly (030, master only).</summary>
public class TurnSetCurrentInfo
{
    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    /// <summary>When going back, deletes the entries of the later turns instead of refusing (409).</summary>
    [JsonPropertyName("discardLaterEntries")]
    public bool DiscardLaterEntries { get; set; }
}
