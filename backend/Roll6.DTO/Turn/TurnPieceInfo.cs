using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>The map piece whose turn is reset.</summary>
public class TurnPieceInfo
{
    [JsonPropertyName("mapTokenId")]
    public long MapTokenId { get; set; }
}
