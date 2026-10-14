using System.Text.Json.Serialization;

namespace Roll6.DTO.Animation;

/// <summary>Renames or retypes a library animation (059). The file is replaced through <see cref="AnimationContentInfo"/>.</summary>
public class AnimationUpdateInfo
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("type")]
    public int Type { get; set; }
}
