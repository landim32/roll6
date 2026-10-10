using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>"Agir": an action of the piece's character or NPC occurrence in the current turn.</summary>
public class TurnActInfo
{
    [JsonPropertyName("mapTokenId")]
    public long MapTokenId { get; set; }

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
