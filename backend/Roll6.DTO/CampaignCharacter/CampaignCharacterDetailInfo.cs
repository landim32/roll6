using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

/// <summary>A participation with the campaign's own copy of the character sheet, which the lists leave out (they are polled).</summary>
public class CampaignCharacterDetailInfo : CampaignCharacterInfo
{
    /// <summary>The character's sheet in this campaign (markdown): copied from the character's sheet when they joined (032).</summary>
    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    /// <summary>The character's own sheet (markdown), read-only here: only its owner changes it.</summary>
    [JsonPropertyName("characterSheet")]
    public string? CharacterSheet { get; set; }

    [JsonPropertyName("characterTokenName")]
    public string? CharacterTokenName { get; set; }

    [JsonPropertyName("characterTokenImageUrl")]
    public string? CharacterTokenImageUrl { get; set; }

    /// <summary>Stored name ({guid}.{ext}) of this campaign's sheet file; send it back in an update to keep the file (032).</summary>
    [JsonPropertyName("sheetFile")]
    public string? SheetFile { get; set; }

    /// <summary>Presigned URL of this campaign's sheet file (image or PDF); this campaign's own copy, not the character's (032).</summary>
    [JsonPropertyName("sheetFileUrl")]
    public string? SheetFileUrl { get; set; }

    /// <summary>"image" or "pdf" (null without a file).</summary>
    [JsonPropertyName("sheetFileType")]
    public string? SheetFileType { get; set; }
}
