using System.Text.Json.Serialization;

namespace Roll6.DTO.Weapon;

/// <summary>
/// The weapon in one hand of a token (082). Written with <c>weaponId</c> and an optional <c>grip</c> (omitted = default);
/// read with the weapon's name, its file URL and the grip (the default filled in).
/// </summary>
public class TokenWeaponInfo
{
    [JsonPropertyName("weaponId")]
    public long WeaponId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("modelFile")]
    public string? ModelFile { get; set; }

    [JsonPropertyName("modelFileUrl")]
    public string? ModelFileUrl { get; set; }

    [JsonPropertyName("grip")]
    public WeaponGripInfo? Grip { get; set; }
}
