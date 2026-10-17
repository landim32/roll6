using System.Text.Json.Serialization;

namespace Roll6.DTO.Weapon;

/// <summary>A new library weapon (082): its name and the .glb uploaded before through <c>POST /api/model</c>.</summary>
public class WeaponInsertInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("modelFile")]
    public string ModelFile { get; set; } = string.Empty;
}
