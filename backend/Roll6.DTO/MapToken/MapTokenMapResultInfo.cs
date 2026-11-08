using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

/// <summary>
/// The piece after changing map (111): the same piece on the target map; <see cref="Adjusted"/> is true when its former
/// hex did not fit there and it went to the nearest free one.
/// </summary>
public class MapTokenMapResultInfo
{
    [JsonPropertyName("mapToken")]
    public MapTokenInfo MapToken { get; set; } = new();

    [JsonPropertyName("fromMapId")]
    public long FromMapId { get; set; }

    [JsonPropertyName("adjusted")]
    public bool Adjusted { get; set; }
}
