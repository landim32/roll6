using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

/// <summary>Current life/energy of a character in a campaign (at most the character's totals).</summary>
public class CampaignCharacterVitalsInfo
{
    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }
}
