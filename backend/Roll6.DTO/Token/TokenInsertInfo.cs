using System.Text.Json.Serialization;

namespace Roll6.DTO.Token;

public class TokenInsertInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("upSpace")]
    public int? UpSpace { get; set; }

    [JsonPropertyName("downSpace")]
    public int? DownSpace { get; set; }

    [JsonPropertyName("upImage")]
    public string? UpImage { get; set; }

    [JsonPropertyName("downImage")]
    public string? DownImage { get; set; }

    /// <summary>"2.5D front" image (034): the figure seen from the front, used by the 3D view. Optional.</summary>
    [JsonPropertyName("frontImage")]
    public string? FrontImage { get; set; }

    /// <summary>"2.5D right" image (035): the figure in profile, looking to the right of the image. Optional.</summary>
    [JsonPropertyName("rightImage")]
    public string? RightImage { get; set; }

    /// <summary>"2.5D left" image (035): the figure in profile, looking to the left of the image. Optional.</summary>
    [JsonPropertyName("leftImage")]
    public string? LeftImage { get; set; }

    /// <summary>"2.5D back" image (035): the figure seen from behind. Optional.</summary>
    [JsonPropertyName("backImage")]
    public string? BackImage { get; set; }
}
