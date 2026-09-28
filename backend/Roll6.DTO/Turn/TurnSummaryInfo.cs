using System.Text.Json.Serialization;

namespace Roll6.DTO.Turn;

/// <summary>Readable markdown of what happened in a turn (024): "## Ações" and "## Posições".</summary>
public class TurnSummaryInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    [JsonPropertyName("markdown")]
    public string Markdown { get; set; } = string.Empty;
}
