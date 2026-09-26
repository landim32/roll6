using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>Current turn of a campaign with its entries so far.</summary>
public class TurnStateInfo
{
    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    [JsonPropertyName("entries")]
    public List<TurnInfo> Entries { get; set; } = new();
}
