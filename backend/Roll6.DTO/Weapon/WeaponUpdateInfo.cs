using System.Text.Json.Serialization;

namespace Roll6.DTO.Weapon;

/// <summary>Changes a library weapon (082, owner only): a field left out (null) keeps its value.</summary>
public class WeaponUpdateInfo
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>A new .glb from <c>POST /api/model</c>: the weapon keeps its id, so every token holding it shows the new file.</summary>
    [JsonPropertyName("modelFile")]
    public string? ModelFile { get; set; }
}
