using System.Text.Json.Serialization;

namespace Roll6.DTO.Token;

public class TokenInfo
{
    [JsonPropertyName("tokenId")]
    public long TokenId { get; set; }

    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("upSpace")]
    public int UpSpace { get; set; }

    [JsonPropertyName("downSpace")]
    public int? DownSpace { get; set; }

    [JsonPropertyName("upImage")]
    public string? UpImage { get; set; }

    [JsonPropertyName("upImageUrl")]
    public string? UpImageUrl { get; set; }

    [JsonPropertyName("downImage")]
    public string? DownImage { get; set; }

    [JsonPropertyName("downImageUrl")]
    public string? DownImageUrl { get; set; }

    /// <summary>"2.5D front" image (034), used by the 3D view.</summary>
    [JsonPropertyName("frontImage")]
    public string? FrontImage { get; set; }

    [JsonPropertyName("frontImageUrl")]
    public string? FrontImageUrl { get; set; }

    /// <summary>"2.5D right" image (035): the figure in profile, looking to the right of the image.</summary>
    [JsonPropertyName("rightImage")]
    public string? RightImage { get; set; }

    [JsonPropertyName("rightImageUrl")]
    public string? RightImageUrl { get; set; }

    /// <summary>"2.5D left" image (035): the figure in profile, looking to the left of the image.</summary>
    [JsonPropertyName("leftImage")]
    public string? LeftImage { get; set; }

    [JsonPropertyName("leftImageUrl")]
    public string? LeftImageUrl { get; set; }

    /// <summary>"2.5D back" image (035): the figure seen from behind.</summary>
    [JsonPropertyName("backImage")]
    public string? BackImage { get; set; }

    [JsonPropertyName("backImageUrl")]
    public string? BackImageUrl { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
