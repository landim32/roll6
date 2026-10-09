using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.DTO.Push;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Application.Notifications;

/// <summary>
/// Delivers one notice (043): who receives it (participants with access now, never the actor, never who muted the
/// campaign), and how — messages/actions are skipped for whoever has the chat on screen; personal notices become a
/// toast in the user's window of that campaign, or a Web Push to every device of the user when it isn't on screen.
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
    private readonly IPushSender _sender;
    private readonly IPresence _presence;
    private readonly INoticeChannel _channel;
    private readonly ILogger<NoticeDispatcher> _logger;

    public NoticeDispatcher(
        ICampaignRepository<Campaign> campaignRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        ICharacterRepository<Character> characterRepository,
        ICampaignNotificationPrefRepository<CampaignNotificationPref> prefRepository,
        IPushSubscriptionRepository<PushSubscription> subscriptionRepository,
        IPushSender sender,
        IPresence presence,
        INoticeChannel channel,
        ILogger<NoticeDispatcher> logger)
    {
        _campaignRepository = campaignRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _characterRepository = characterRepository;
        _prefRepository = prefRepository;
        _subscriptionRepository = subscriptionRepository;
        _sender = sender;
        _presence = presence;
        _channel = channel;
        _logger = logger;
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
        var pushUsers = new List<long>();
        foreach (var userId in recipients)
        {
            if (!notice.IsPersonal)
            {
                // Looking at the chat already: nothing to warn about.
                if (!_presence.IsChatVisible(userId, campaign.CampaignId))
                    pushUsers.Add(userId);
            }
            else if (_presence.IsCampaignVisible(userId, campaign.CampaignId))
            {
                await _channel.SendNoticeAsync(userId, campaign.CampaignId, new NoticeInfo
                {
                    Kind = KindKey(notice.Kind),
                    CampaignId = campaign.CampaignId,
                    Title = title,
                    Body = notice.BodyFor(userId)
                });
            }
            else
            {
                pushUsers.Add(userId);
            }
        }

        if (pushUsers.Count == 0 || !_sender.Enabled)
            return;
        var subscriptions = await _subscriptionRepository.ListByUsersAsync(pushUsers);
        foreach (var subscription in subscriptions)
            await PushAsync(subscription, notice, campaign, title);
    }

    /// <summary>The master and the owners of the campaign's approved characters, as they are now.</summary>
    private async Task<HashSet<long>> ParticipantsAsync(Campaign campaign)
    {
        var approved = await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true);
        var characters = await _characterRepository.ListByIdsAsync(approved.Select(p => p.CharacterId).Distinct());
        var users = characters.Select(c => c.UserId).ToHashSet();
        users.Add(campaign.UserId);
        return users;
    }

    private async Task PushAsync(PushSubscription subscription, TableNotice notice, Campaign campaign, string title)
    {
        var kind = KindKey(notice.Kind);
        var chat = !notice.IsPersonal;
        var payload = JsonSerializer.Serialize(new
        {
            title,
            body = notice.BodyFor(subscription.UserId),
            icon = notice.IconUrl ?? DEFAULT_ICON,
            tag = chat ? $"campaign:{campaign.CampaignId}:chat" : $"campaign:{campaign.CampaignId}:{kind}",
            url = $"/campaign/{campaign.Slug}?chat=1",
            kind,
            renotify = !chat
        }, JSON);
        // The topic also replaces an undelivered message of the same kind at the push service (≤ 32 url-safe chars).
        var topic = $"c{campaign.CampaignId}-{(chat ? "chat" : kind)}";
        var ttl = notice.Kind == NoticeKind.TurnFinished ? TimeSpan.FromHours(6) : chat ? TimeSpan.FromHours(1) : TimeSpan.FromHours(2);
        var result = await _sender.SendAsync(new PushTarget(subscription.Endpoint, subscription.P256dh, subscription.Auth),
            payload, topic, urgent: !chat, ttl);
        switch (result)
        {
            case PushSendResult.Gone:
                await _subscriptionRepository.DeleteAsync(subscription.PushSubscriptionId);
                break;
            case PushSendResult.Sent:
                await _subscriptionRepository.TouchAsync(subscription.PushSubscriptionId, DateTime.UtcNow);
                break;
            default:
                _logger.LogInformation("Push of a {Kind} notice to subscription {Id} was not delivered", kind, subscription.PushSubscriptionId);
                break;
        }
    }

    public static string KindKey(NoticeKind kind) => kind switch
    {
        NoticeKind.Message => "message",
        NoticeKind.Action => "action",
        NoticeKind.Majority => "majority",
        NoticeKind.TurnFinished => "turnFinished",
        NoticeKind.Life => "life",
        NoticeKind.Fatigue => "fatigue",
        NoticeKind.Poke => "poke",
        _ => kind.ToString()
    };
}
