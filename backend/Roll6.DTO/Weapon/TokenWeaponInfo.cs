using System.Text.Json.Serialization;

namespace Roll6.DTO.Weapon;

/// <summary>
/// A library weapon in one socket of a token's 3D model (083). Written with <c>socket</c> (1 right hand, 2 left hand,
/// 3 back, 4 right holster, 5 left holster), <c>weaponId</c> and an optional <c>grip</c> (the size and the fine
/// adjustment; omitted = default); read with the weapon's name, file, grip point and standard pose, and the grip with
/// the default filled in.
/// </summary>
public class TokenWeaponInfo
{
    [JsonPropertyName("socket")]
    public int Socket { get; set; }

    [JsonPropertyName("weaponId")]
    public long WeaponId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("modelFile")]
    public string? ModelFile { get; set; }

    [JsonPropertyName("modelFileUrl")]
    public string? ModelFileUrl { get; set; }

    /// <summary>The weapon's grip point (read only; the weapon's own, see <see cref="WeaponInfo.GripPoint"/>).</summary>
    [JsonPropertyName("gripPoint")]
    public WeaponGripPointInfo? GripPoint { get; set; }

    /// <summary>The weapon's standard pose (read only; the weapon's own, see <see cref="WeaponInfo.Pose"/>).</summary>
    [JsonPropertyName("pose")]
    public WeaponPoseInfo? Pose { get; set; }

    /// <summary>The size and the fine adjustment of this token's socket, in the socket's frame.</summary>
    [JsonPropertyName("grip")]
    public WeaponGripInfo? Grip { get; set; }
}
