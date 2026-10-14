using System.Text.Json;
using System.Text.Json.Serialization;

namespace Roll6.DTO.Animation;

/// <summary>Replaces the file of a library animation: the new <c>roll6-animation</c> content.</summary>
public class AnimationContentInfo
{
    /// <summary>The animation file (JSON object in the <c>roll6-animation</c> format, version 1).</summary>
    [JsonPropertyName("content")]
    public JsonElement Content { get; set; }
}
