using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignPlan;

/// <summary>A plan entry with its markdown and the current URLs of the images it references.</summary>
public class CampaignPlanDetailInfo : CampaignPlanInfo
{
    /// <summary>Markdown; images are referenced as <c>roll6-image:{fileName}</c>.</summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>File name → presigned URL of each referenced image (valid for a while; never stored).</summary>
    [JsonPropertyName("imageUrls")]
    public Dictionary<string, string> ImageUrls { get; set; } = new();
}
