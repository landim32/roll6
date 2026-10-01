using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

/// <summary>What the owner or the master changes in a participation during play.</summary>
public class CampaignCharacterUpdateInfo
{
    [JsonPropertyName("currentLife")]
    public int CurrentLife { get; set; }

    [JsonPropertyName("currentEnergy")]
    public int CurrentEnergy { get; set; }

    [JsonPropertyName("characterStatus")]
    public string? CharacterStatus { get; set; }

    /// <summary>The character's sheet in this campaign (markdown), copied from the character's sheet when they joined (032).</summary>
    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }

    /// <summary>New token of the character (saved on the character, used on every map); null keeps the current one.</summary>
    [JsonPropertyName("tokenId")]
    public long? TokenId { get; set; }

    /// <summary>1 standing, 2 down, 3 out of combat (031); null keeps the current posture.</summary>
    [JsonPropertyName("posture")]
    public int? Posture { get; set; }

    /// <summary>
    /// This campaign's sheet file (image or PDF): the fileName returned by POST /api/document replaces it, an empty
    /// string removes it, and null (or an omitted field) keeps the current one. Unlike CharacterInsertInfo.sheetFile,
    /// where null removes: this DTO is a partial update, like its tokenId and posture (032).
    /// </summary>
    [JsonPropertyName("sheetFile")]
    public string? SheetFile { get; set; }
}
