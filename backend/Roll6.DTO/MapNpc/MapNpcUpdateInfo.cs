using System.Text.Json.Serialization;

namespace Roll6.DTO.MapNpc;

public class MapNpcUpdateInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }
}
