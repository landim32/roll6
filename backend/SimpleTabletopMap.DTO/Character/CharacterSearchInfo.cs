using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.Character;

/// <summary>Public view of any user's character (search for invites): no sheet or stats.</summary>
public class CharacterSearchInfo
{
    [JsonPropertyName("characterId")]
    public long CharacterId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    [JsonPropertyName("ownerId")]
    public long OwnerId { get; set; }

    [JsonPropertyName("ownerName")]
    public string OwnerName { get; set; } = string.Empty;
}
