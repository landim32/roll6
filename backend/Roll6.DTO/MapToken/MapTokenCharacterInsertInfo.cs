using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

/// <summary>
/// Places a campaign character on a map, or takes it there from another one (108). <see cref="TokenId"/> is only used
/// (and saved on the character) when the character has no token yet.
/// </summary>
public class MapTokenCharacterInsertInfo
{
    [JsonPropertyName("mapId")]
    public long MapId { get; set; }

    [JsonPropertyName("campaignCharacterId")]
    public long CampaignCharacterId { get; set; }

    [JsonPropertyName("tokenId")]
    public long? TokenId { get; set; }

    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    /// <summary>
    /// The master confirmed taking the character from the map where it is (108); without it such a placement is refused
    /// naming that map. No effect on a character off every map.
    /// </summary>
    [JsonPropertyName("transfer")]
    public bool Transfer { get; set; }
}
