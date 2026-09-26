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

    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }
}
