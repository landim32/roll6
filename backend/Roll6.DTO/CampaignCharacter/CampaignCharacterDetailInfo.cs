using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

/// <summary>A participation with the campaign notes (<see cref="Sheet"/>), which the lists leave out (they are polled).</summary>
public class CampaignCharacterDetailInfo : CampaignCharacterInfo
{
    /// <summary>Campaign notes: what changed in this campaign compared to the character's sheet (markdown).</summary>
    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    /// <summary>The character's own sheet (markdown), read-only here: only its owner changes it.</summary>
    [JsonPropertyName("characterSheet")]
    public string? CharacterSheet { get; set; }

    [JsonPropertyName("characterTokenName")]
    public string? CharacterTokenName { get; set; }

    [JsonPropertyName("characterTokenImageUrl")]
    public string? CharacterTokenImageUrl { get; set; }

    /// <summary>Presigned URL of the character's sheet file (image or PDF, 022); same for every campaign.</summary>
    [JsonPropertyName("sheetFileUrl")]
    public string? SheetFileUrl { get; set; }

    /// <summary>"image" or "pdf" (null without a file).</summary>
    [JsonPropertyName("sheetFileType")]
    public string? SheetFileType { get; set; }
}
