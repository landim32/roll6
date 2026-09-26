using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

/// <summary>New cell (column/row, odd-q) of a map token.</summary>
public class MapTokenPositionInfo
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }
}
