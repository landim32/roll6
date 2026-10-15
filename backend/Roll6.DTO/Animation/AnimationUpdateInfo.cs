using System.Text.Json;
using System.Text.Json.Serialization;

namespace Roll6.DTO.Animation;

/// <summary>
/// Changes a library animation (059): any of name, type and file, in one request. A field left out (null) keeps its
/// value; a content replaces the file as <see cref="AnimationContentInfo"/> does.
/// </summary>
public class AnimationUpdateInfo
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("type")]
    public int? Type { get; set; }

    /// <summary>The new animation file (JSON object in the <c>roll6-animation</c> format, version 1); null keeps the file.</summary>
    [JsonPropertyName("content")]
    public JsonElement? Content { get; set; }
}
