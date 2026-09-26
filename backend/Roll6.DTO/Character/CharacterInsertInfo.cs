using System.Text.Json.Serialization;

namespace Roll6.DTO.Character;

public class CharacterInsertInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    [JsonPropertyName("life")]
    public int Life { get; set; }

    [JsonPropertyName("energy")]
    public int Energy { get; set; }

    [JsonPropertyName("move")]
    public int Move { get; set; }

    [JsonPropertyName("image")]
    public string? Image { get; set; }

    /// <summary>Library token used when the character is placed on a map (optional).</summary>
    [JsonPropertyName("tokenId")]
    public long? TokenId { get; set; }
}
