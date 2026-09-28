using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

/// <summary>A participation with the campaign sheet, which the lists leave out (they are polled).</summary>
public class CampaignCharacterDetailInfo : CampaignCharacterInfo
{
    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    /// <summary>Presigned URL of the character's sheet file (image or PDF, 022); same for every campaign.</summary>
    [JsonPropertyName("sheetFileUrl")]
    public string? SheetFileUrl { get; set; }

    /// <summary>"image" or "pdf" (null without a file).</summary>
    [JsonPropertyName("sheetFileType")]
    public string? SheetFileType { get; set; }
}
