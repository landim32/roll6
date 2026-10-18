using System.Text.Json.Serialization;

namespace Roll6.DTO.Weapon;

/// <summary>
/// The standard pose of a library weapon (083): Euler XYZ in whole degrees (−360…360 accepted, stored 0…359), that stands
/// the file's model with its tip along +Y, its edge along +X and its outer face along +Z. Default (0, 0, 0) = the file as is.
/// </summary>
public class WeaponPoseInfo
{
    [JsonPropertyName("rx")]
    public int Rx { get; set; }

    [JsonPropertyName("ry")]
    public int Ry { get; set; }

    [JsonPropertyName("rz")]
    public int Rz { get; set; }
}
