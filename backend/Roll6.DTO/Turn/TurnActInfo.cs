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

    /// <summary>
    /// "Ação sobre…" (098): the hex the action is about, only with <see cref="MapTokenId"/> (a piece on a map). The
    /// server records the piece under it (if any) as it is now and the distance from the actor's piece.
    /// </summary>
    [JsonPropertyName("target")]
    public TurnTargetInsertInfo? Target { get; set; }
}

/// <summary>The hex an action is about (098), on the actor's map.</summary>
public class TurnTargetInsertInfo
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }

    /// <summary>
    /// Optional: the piece the caller saw on the hex; it must be on the same map and cover the hex. Omitted: the piece
    /// covering the hex is taken (the one drawn on top when several share it), or none.
    /// </summary>
    [JsonPropertyName("mapTokenId")]
    public long? MapTokenId { get; set; }
}
