using System.Text.Json.Serialization;

namespace Roll6.DTO.Weapon;

/// <summary>
/// Where the hand holds a library weapon (083): fractions of the file's bounding box, 0…1 per axis, in the file's own
/// frame (0.5 everywhere = the middle, the default). The 3D view puts this point on the socket and turns and scales the
/// weapon about it.
/// </summary>
public class WeaponGripPointInfo
{
    [JsonPropertyName("x")]
    public double X { get; set; } = 0.5;

    [JsonPropertyName("y")]
    public double Y { get; set; } = 0.5;

    [JsonPropertyName("z")]
    public double Z { get; set; } = 0.5;
}
