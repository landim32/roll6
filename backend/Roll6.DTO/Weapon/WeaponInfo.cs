using System.Text.Json.Serialization;

namespace Roll6.DTO.Weapon;

/// <summary>A library weapon (082). The file is read like a token's model: the stored name through <c>GET /api/model/file/{name}</c>.</summary>
public class WeaponInfo
{
    [JsonPropertyName("weaponId")]
    public long WeaponId { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("ownerName")]
    public string? OwnerName { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>The stored .glb ({guid}.glb), as returned by <c>POST /api/model</c>.</summary>
    [JsonPropertyName("modelFile")]
    public string ModelFile { get; set; } = string.Empty;

    [JsonPropertyName("modelFileUrl")]
    public string? ModelFileUrl { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
