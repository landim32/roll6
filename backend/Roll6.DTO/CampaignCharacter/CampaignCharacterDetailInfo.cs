using System.Text.Json.Serialization;

namespace Roll6.DTO.CampaignCharacter;

/// <summary>A participation with the campaign sheet, which the lists leave out (they are polled).</summary>
public class CampaignCharacterDetailInfo : CampaignCharacterInfo
{
    [JsonPropertyName("sheet")]
    public string? Sheet { get; set; }
}
