using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

/// <summary>What the owner or the master changes in a participation during play.</summary>
public class CampaignCharacterUpdateInfo
{
    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }

    [JsonPropertyName("characterStatus")]
    public string? CharacterStatus { get; set; }

    /// <summary>Campaign notes: only the differences from the character's sheet that happened in this campaign.</summary>
    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    /// <summary>New token of the character (saved on the character, used on every map); null keeps the current one.</summary>
    [JsonPropertyName("tokenId")]
    public long? TokenId { get; set; }
}
