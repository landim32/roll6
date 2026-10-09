namespace Roll6.Domain.Models;

/// <summary>A user's notification choice for one campaign (043): muted or not. No row means not muted.</summary>
public class CampaignNotificationPref
{
    public long CampaignNotificationPrefId { get; set; }
    public long UserId { get; set; }
    public long CampaignId { get; set; }
    public bool Muted { get; set; }

    public static CampaignNotificationPref Create(long userId, long campaignId, bool muted) =>
        new() { UserId = userId, CampaignId = campaignId, Muted = muted };
}
