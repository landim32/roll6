using System.Text.Encodings.Web;
using System.Text.Json;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Application.Notifications;

/// <summary>
/// Delivers one notice (043, 074): who receives it (participants with access now, never the actor, never who muted the
/// campaign) and, for each of them, one push per registered device — whatever is open on any screen; there is no in-app
/// toast. The notice goes into each recipient's inbox (the bell) and the pushes into the durable outbox, which
/// <see cref="PushDeliveryWorker"/> sends.
/// </summary>
public class NoticeDispatcher
{
    public const string DEFAULT_ICON = "/brand/icon-192.png";

    // Accents as they are: the payload stays small (push services cap it at ~4 KB) and readable.
    private static readonly JsonSerializerOptions JSON = new(JsonSerializerDefaults.Web) { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly ICharacterRepository<Character> _characterRepository;
    private readonly ICampaignNotificationPrefRepository<CampaignNotificationPref> _prefRepository;
    private readonly IPushSubscriptionRepository<PushSubscription> _subscriptionRepository;
    private readonly IPushDeliveryRepository<PushDelivery> _deliveryRepository;
    private readonly IPushSender _sender;
    private readonly IUserNotificationRepository<UserNotification> _inboxRepository;
    private readonly INoticeChannel _channel;
    private readonly PushDeliverySignal _signal;
    private readonly TimeProvider _time;

    public NoticeDispatcher(
        ICampaignRepository<Campaign> campaignRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        ICharacterRepository<Character> characterRepository,
        ICampaignNotificationPrefRepository<CampaignNotificationPref> prefRepository,
        IPushSubscriptionRepository<PushSubscription> subscriptionRepository,
        IPushDeliveryRepository<PushDelivery> deliveryRepository,
        IUserNotificationRepository<UserNotification> inboxRepository,
        IPushSender sender,
        INoticeChannel channel,
        PushDeliverySignal signal,
        TimeProvider time)
    {
        _campaignRepository = campaignRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _characterRepository = characterRepository;
        _prefRepository = prefRepository;
        _subscriptionRepository = subscriptionRepository;
        _deliveryRepository = deliveryRepository;
        _inboxRepository = inboxRepository;
        _sender = sender;
        _channel = channel;
        _signal = signal;
        _time = time;
    }

    public async Task DispatchAsync(TableNotice notice)
    {
        var campaign = await _campaignRepository.GetByIdAsync(notice.CampaignId);
        if (campaign == null)
            return;

        var participants = await ParticipantsAsync(campaign);
        var muted = (await _prefRepository.ListMutedUserIdsAsync(campaign.CampaignId)).ToHashSet();
        var recipients = (notice.TargetUserIds ?? participants.ToList())
            .Where(id => id != notice.ActorUserId && participants.Contains(id) && !muted.Contains(id))
            .Distinct()
            .ToList();
        if (recipients.Count == 0)
            return;

        var title = NoticeTexts.Title(notice.Speaker, campaign.Name);
        var url = UrlOf(campaign);
        var kind = KindKey(notice.Kind);

        // The bell lists every notice exactly as it was sent.
        await _inboxRepository.InsertRangeAsync(recipients.Select(userId =>
            UserNotification.Create(userId, campaign.CampaignId, kind, title, notice.BodyFor(userId), url)));
        foreach (var userId in recipients)
            await _channel.InboxChangedAsync(userId);

        if (!_sender.Enabled)
            return;
        var now = _time.GetUtcNow().UtcDateTime;
        var devices = await _subscriptionRepository.ListByUsersAsync(recipients);
        var deliveries = devices.Select(device => PushDelivery.Create(device.PushSubscriptionId,
                Payload(title, notice.BodyFor(device.UserId), notice.IconUrl, $"campaign:{campaign.CampaignId}:{kind}", url, kind),
                $"c{campaign.CampaignId}-{kind}", now))
            .ToList();
        if (deliveries.Count == 0)
            return;
        await _deliveryRepository.InsertRangeAsync(deliveries);
        _signal.Pulse();
    }

    /// <summary>
    /// What the service worker shows. <c>renotify</c> is always on (074): a new notice that replaces an older one of
    /// the same tag still sounds — before, a second chat message replaced the first in silence.
    /// </summary>
    public static string Payload(string title, string body, string? icon, string tag, string url, string kind) =>
        JsonSerializer.Serialize(new
        {
            title,
            body,
            icon = icon ?? DEFAULT_ICON,
            tag,
            url,
            kind,
            renotify = true
        }, JSON);

    /// <summary>The master and the owners of the campaign's approved characters, as they are now.</summary>
    private async Task<HashSet<long>> ParticipantsAsync(Campaign campaign)
    {
        var approved = await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true);
        var characters = await _characterRepository.ListByIdsAsync(approved.Select(p => p.CharacterId).Distinct());
        var users = characters.Select(c => c.UserId).ToHashSet();
        users.Add(campaign.UserId);
        return users;
    }

    private static string UrlOf(Campaign campaign) => $"/campaign/{campaign.Slug}?chat=1";

    public static string KindKey(NoticeKind kind) => kind switch
    {
        NoticeKind.Message => "message",
        NoticeKind.Action => "action",
        NoticeKind.Pending => "pending",
        NoticeKind.TurnFinished => "turnFinished",
        NoticeKind.Life => "life",
        NoticeKind.Fatigue => "fatigue",
        NoticeKind.Poke => "poke",
        NoticeKind.PokeMaster => "pokeMaster",
        _ => kind.ToString()
    };
}
