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

    /// <summary>Current life in this campaign (may be zero or negative; that does not change posture).</summary>
    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }

    /// <summary>The character's total life (Character.Life).</summary>
    [JsonPropertyName("totalLife")]
    public int TotalLife { get; set; }

    [JsonPropertyName("totalEnergy")]
    public int TotalEnergy { get; set; }

    /// <summary>The character's permanent move (same in every campaign; only the owner changes it).</summary>
    [JsonPropertyName("characterMove")]
    public int CharacterMove { get; set; }

    /// <summary>
    /// Movement limit per turn on this campaign's maps ("Deslocamento", 037): starts at the character's move and is
    /// changed by the owner or the master. This is what limits a player's moves, not <see cref="CharacterMove"/>.
    /// </summary>
    [JsonPropertyName("currentMove")]
    public int CurrentMove { get; set; }

    /// <summary>Free-text condition of the character in this campaign (not the participation status).</summary>
    [JsonPropertyName("characterStatus")]
    public string? CharacterStatus { get; set; }

    /// <summary>1 standing ("Em pé"), 2 down ("Caído"), 3 out of combat ("Fora de combate") (031).</summary>
    [JsonPropertyName("posture")]
    public int Posture { get; set; } = 1;

    /// <summary>The character's token; without one, placing it on a map asks for a token.</summary>
    [JsonPropertyName("characterTokenId")]
    public long? CharacterTokenId { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
