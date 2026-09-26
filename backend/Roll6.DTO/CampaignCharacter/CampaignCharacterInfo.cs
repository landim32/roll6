using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

public class CampaignCharacterInfo
{
    [JsonPropertyName("campaignCharacterId")]
    public long CampaignCharacterId { get; set; }

    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("campaignName")]
    public string CampaignName { get; set; } = string.Empty;

    [JsonPropertyName("campaignOwnerName")]
    public string CampaignOwnerName { get; set; } = string.Empty;

    [JsonPropertyName("characterId")]
    public long CharacterId { get; set; }

    [JsonPropertyName("characterName")]
    public string CharacterName { get; set; } = string.Empty;

    [JsonPropertyName("characterImageUrl")]
    public string? CharacterImageUrl { get; set; }

    [JsonPropertyName("characterOwnerId")]
    public long CharacterOwnerId { get; set; }

    [JsonPropertyName("characterOwnerName")]
    public string CharacterOwnerName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public int Status { get; set; }

    /// <summary>Current life in this campaign (may be zero or negative: fallen).</summary>
    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }

    /// <summary>The character's total life (Character.Life).</summary>
    [JsonPropertyName("totalLife")]
    public int TotalLife { get; set; }

    [JsonPropertyName("totalEnergy")]
    public int TotalEnergy { get; set; }

    [JsonPropertyName("characterMove")]
    public int CharacterMove { get; set; }

    /// <summary>Free-text condition of the character in this campaign (not the participation status).</summary>
    [JsonPropertyName("characterStatus")]
    public string? CharacterStatus { get; set; }

    /// <summary>The character's token; without one, placing it on a map asks for a token.</summary>
    [JsonPropertyName("characterTokenId")]
    public long? CharacterTokenId { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
