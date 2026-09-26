using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

/// <summary>Another library token for an existing map token.</summary>
public class MapTokenTokenInfo
{
    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }
}
