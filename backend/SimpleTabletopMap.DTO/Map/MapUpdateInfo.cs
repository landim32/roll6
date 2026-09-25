using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.Map;

public class MapUpdateInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; set; }
}
