using System.Text.Json.Serialization;

namespace Roll6.DTO.Campaign;

/// <summary>Body of <c>PUT /api/campaign/{id}/pending-notice</c> (072): whether the chat shows who still owes a play.</summary>
public class CampaignPendingNoticeInfo
{
    [JsonPropertyName("pendingNotice")]
    public bool PendingNotice { get; set; }
}
