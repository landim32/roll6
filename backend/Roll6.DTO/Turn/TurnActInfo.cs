using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>"Agir": an action of the piece's character or NPC occurrence in the current turn.</summary>
public class TurnActInfo
{
    [JsonPropertyName("mapTokenId")]
    public long MapTokenId { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;
}
