using System.Text.Json.Serialization;

namespace Roll6.DTO.MapToken;

/// <summary>New posture of the character/NPC shown by a piece (031).</summary>
public class MapTokenPostureInfo
{
    /// <summary>1 standing ("Em pé"), 2 down ("Caído"), 3 out of combat ("Fora de combate").</summary>
    [JsonPropertyName("posture")]
    public int Posture { get; set; }
}
