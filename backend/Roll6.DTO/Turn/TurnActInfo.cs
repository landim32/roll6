using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>
/// "Agir": an action in the current turn. Give either the piece (<see cref="MapTokenId"/>: its character or NPC occurrence)
/// or, since 080, the campaign and the character (<see cref="CampaignId"/> + <see cref="CharacterId"/>) for a character
/// that has no piece on the map.
/// </summary>
public class TurnActInfo
{
    [JsonPropertyName("mapTokenId")]
    public long? MapTokenId { get; set; }

    /// <summary>080: the campaign of a character acting without a piece (with <see cref="CharacterId"/>).</summary>
    [JsonPropertyName("campaignId")]
    public long? CampaignId { get; set; }

    /// <summary>080: the character acting without a piece (with <see cref="CampaignId"/>).</summary>
    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>The chat entry this action answers (044).</summary>
    [JsonPropertyName("replyToTurnId")]
    public long? ReplyToTurnId { get; set; }

    /// <summary>A whispered action (047): the others see "está sussurrando!" instead of the text.</summary>
    [JsonPropertyName("whisperCharacterIds")]
    public List<long>? WhisperCharacterIds { get; set; }

    [JsonPropertyName("whisperMaster")]
    public bool? WhisperMaster { get; set; }
}
