using System.Text.Json.Serialization;

namespace Roll6.DTO.Character;

/// <summary>Transfers a character to another user, identified by the exact e-mail (021).</summary>
public class CharacterTransferInfo
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
}
