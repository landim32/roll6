using System.Text.Json.Serialization;

namespace Roll6.DTO.Token;

public class TokenInsertInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("upSpace")]
    public int? UpSpace { get; set; }

    [JsonPropertyName("downSpace")]
    public int? DownSpace { get; set; }

    [JsonPropertyName("upImage")]
    public string? UpImage { get; set; }

    [JsonPropertyName("downImage")]
    public string? DownImage { get; set; }
}
