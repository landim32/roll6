using System.Text.Json;
using System.Text.Json.Serialization;

namespace Roll6.DTO.Animation;

/// <summary>Replaces the file of a library animation: the new <c>roll6-animation</c> content.</summary>
public class AnimationContentInfo
{
    /// <summary>The animation file (JSON object in the <c>roll6-animation</c> format, version 1).</summary>
    [JsonPropertyName("content")]
    public JsonElement Content { get; set; }

    /// <summary>
    /// The library card's picture (090): null keeps it, <c>""</c> removes it, a name from <c>POST /api/image</c> replaces
    /// it. The new content clears the stored one unless a new one comes in the same request.
    /// </summary>
    [JsonPropertyName("thumbnailImage")]
    public string? ThumbnailImage { get; set; }
}
