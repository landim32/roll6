using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>One field changed by a CharacterUpdate turn entry (024).</summary>
public class TurnChangeInfo
{
    /// <summary>currentLife, currentEnergy, characterStatus, notes, name, life, energy, move or status.</summary>
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("before")]
    public string? Before { get; set; }

    [JsonPropertyName("after")]
    public string? After { get; set; }
}
