using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

public class TurnResetResultInfo
{
    /// <summary>Entries removed from the current turn.</summary>
    [JsonPropertyName("removed")]
    public int Removed { get; set; }

    /// <summary>False when the move couldn't be undone (the former hex is taken).</summary>
    [JsonPropertyName("reverted")]
    public bool Reverted { get; set; }
}
