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

    /// <summary>The bell's inbox: the latest notices the user received and how many are unread.</summary>
    Task<UserNotificationPageInfo> ListInboxAsync(long userId);

    /// <summary>Marks one notice (id) or all (null) as read.</summary>
    Task MarkInboxReadAsync(long userId, UserNotificationReadInfo info);

    /// <summary>The user's devices that receive notifications (074).</summary>
    Task<List<PushDeviceInfo>> ListDevicesAsync(long userId);

    /// <summary>Sends a test push right now to one device (by endpoint) or to all of the user's (074).</summary>
    Task<PushTestResultInfo> TestAsync(long userId, PushTestInfo info);

    /// <summary>Master: sends to their own devices, right now, a notice of the given kind as the table would (074).</summary>
    Task<PushTestResultInfo> SimulateAsync(long userId, long campaignId, NotificationSimulateInfo info);

    /// <summary>Master: who is still missing in the turn and the "Falta…" each would get now (074).</summary>
    Task<TurnNoticePreviewInfo> PreviewAsync(long userId, long campaignId);
}
