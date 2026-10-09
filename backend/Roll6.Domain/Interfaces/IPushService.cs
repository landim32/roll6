using Roll6.DTO.Push;

namespace Roll6.Domain.Interfaces;

/// <summary>Web Push (043): this device's subscription and the notification choice of each campaign.</summary>
public interface IPushService
{
    /// <summary>The VAPID public key the browser subscribes with; null when notifications are not configured.</summary>
    PushKeyInfo GetKey();

    /// <summary>Registers (or takes over) this device's endpoint for the user.</summary>
    Task SubscribeAsync(long userId, PushSubscriptionInfo info);

    /// <summary>Stops this device (only the user's own endpoint; idempotent).</summary>
    Task UnsubscribeAsync(long userId, PushUnsubscribeInfo info);

    /// <summary>The campaigns of the user's table (master or approved character) and whether each is muted.</summary>
    Task<List<CampaignNotificationInfo>> ListCampaignsAsync(long userId);

    Task<CampaignNotificationInfo> SetMutedAsync(long userId, long campaignId, CampaignNotificationUpdateInfo info);
}
