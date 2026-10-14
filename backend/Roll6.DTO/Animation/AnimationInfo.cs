using System.Text.Json.Serialization;

namespace Roll6.DTO.Animation;

/// <summary>A library animation (059). The file is read through <see cref="FileUrl"/> (the API, never the bucket).</summary>
public class AnimationInfo
{
    [JsonPropertyName("animationId")]
    public long AnimationId { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("ownerName")]
    public string? OwnerName { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>1 Parado, 2 Andando, 3 Correndo, 4 Agachado, 5 Derrotado, 6 Atacando, 7 Defendendo.</summary>
    [JsonPropertyName("type")]
    public int Type { get; set; }

    [JsonPropertyName("duration")]
    public double Duration { get; set; }

    [JsonPropertyName("loop")]
    public bool Loop { get; set; }

    /// <summary>The route that serves the file: <c>/api/animation/{id}/file</c>.</summary>
    [JsonPropertyName("fileUrl")]
    public string FileUrl { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
