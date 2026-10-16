using System.Text.Json.Serialization;

namespace Roll6.DTO.Chat;

/// <summary>Body of <c>POST /api/chat/{id}/speaker</c> (079): the new voice — one of the master's characters, or null for the master.</summary>
public class ChatSpeakerInfo
{
    [JsonPropertyName("characterId")]
    public long? CharacterId { get; set; }
}
