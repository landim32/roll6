using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

/// <summary>New status of a campaign (049): 1 Preparando, 2 Ativa, 3 Pausada, 4 Finalizada.</summary>
public class CampaignStatusInfo
{
    [JsonPropertyName("status")]
    public int Status { get; set; }
}
