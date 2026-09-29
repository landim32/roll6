using System.Text.Json.Serialization;

namespace Roll6.DTO.MapNpc;

public class MapNpcUpdateInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Current life (at most the NPC's life; 0 or below = fallen).</summary>
    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    /// <summary>Current energy (at most the NPC's energy).</summary>
    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    /// <summary>1 standing, 2 down, 3 out of combat (031); null keeps the current posture.</summary>
    [JsonPropertyName("posture")]
    public int? Posture { get; set; }
}
