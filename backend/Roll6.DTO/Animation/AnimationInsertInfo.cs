using System.Text.Json;
using System.Text.Json.Serialization;

namespace Roll6.DTO.Animation;

/// <summary>Uploads a library animation (059): its name, its type and the <c>roll6-animation</c> file itself.</summary>
public class AnimationInsertInfo
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>1 Parado, 2 Andando, 3 Correndo, 4 Agachado, 5 Derrotado, 6 Atacando, 7 Defendendo.</summary>
    [JsonPropertyName("type")]
    public int Type { get; set; }

    /// <summary>The animation file (JSON object in the <c>roll6-animation</c> format, version 1).</summary>
    [JsonPropertyName("content")]
    public JsonElement Content { get; set; }
}
