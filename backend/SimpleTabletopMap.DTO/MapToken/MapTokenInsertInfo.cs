using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.MapToken;

public class MapTokenInsertInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("tokenType")]
    public int TokenType { get; set; }

    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("move")]
    public int Move { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    [JsonPropertyName("look")]
    public int? Look { get; set; }
}
