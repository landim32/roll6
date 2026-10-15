using System.Text.Encodings.Web;
using System.Text.Json;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.DTO.Push;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// Web Push subscriptions and per-campaign mute (043); since 074 also the device list, the device test and the master's
/// simulation/preview. Table notices are delivered by the notification and push workers; tests and simulations are sent
/// here, synchronously, so the answer says how each device took them.
/// </summary>
public class PushService : IPushService
{
    private readonly IPushSubscriptionRepository<PushSubscription> _subscriptionRepository;
    private readonly ICampaignNotificationPrefRepository<CampaignNotificationPref> _prefRepository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IPushSender _sender;
    private readonly IUserNotificationRepository<UserNotification> _inboxRepository;
    private readonly ICharacterRepository<Character> _characterRepository;
    private readonly IUserRepository<User> _userRepository;
    private readonly ITurnRepository<Turn> _turnRepository;
    private readonly TimeProvider _time;

    /// <summary>How many notices the bell shows.</summary>
    public const int INBOX_SIZE = 30;

    /// <summary>The kinds the master can simulate (074).</summary>
    public static readonly IReadOnlyList<string> SIMULATED_KINDS = new[]
    {
        "message", "action", "pending", "pendingLast", "turnFinished", "life", "fatigue", "poke", "pokeMaster"
    };

    private static readonly JsonSerializerOptions JSON = new(JsonSerializerDefaults.Web) { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public PushService(
        IPushSubscriptionRepository<PushSubscription> subscriptionRepository,
        ICampaignNotificationPrefRepository<CampaignNotificationPref> prefRepository,
        ICampaignRepository<Campaign> campaignRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IPushSender sender,
        IUserNotificationRepository<UserNotification> inboxRepository,
        ICharacterRepository<Character> characterRepository,
        IUserRepository<User> userRepository,
        ITurnRepository<Turn> turnRepository,
        TimeProvider time)
    {
        _characterRepository = characterRepository;
        _userRepository = userRepository;
        _turnRepository = turnRepository;
        _time = time;
        _inboxRepository = inboxRepository;
        _subscriptionRepository = subscriptionRepository;
        _prefRepository = prefRepository;
        _campaignRepository = campaignRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _sender = sender;
    }

    public PushKeyInfo GetKey() => new() { PublicKey = _sender.Enabled ? _sender.PublicKey : null };

    public async Task SubscribeAsync(long userId, PushSubscriptionInfo info)
    {
        var endpoint = info.Endpoint?.Trim() ?? string.Empty;
        var existing = endpoint.Length == 0 ? null : await _subscriptionRepository.GetByEndpointAsync(endpoint);
        if (existing == null)
        {
            await _subscriptionRepository.InsertAsync(
                PushSubscription.Create(userId, endpoint, info.Keys?.P256dh, info.Keys?.Auth, info.UserAgent));
            return;
        }
        // The same browser registered again: maybe renewed keys, maybe another user on a shared device.
        existing.MoveTo(userId, info.Keys?.P256dh, info.Keys?.Auth, info.UserAgent);
        await _subscriptionRepository.UpdateAsync(existing);
    }

    public async Task UnsubscribeAsync(long userId, PushUnsubscribeInfo info)
    {
        if (string.IsNullOrWhiteSpace(info.Endpoint))
            throw new DomainValidationException("endpoint", "Informe o endereço de notificações deste aparelho.");
        await _subscriptionRepository.DeleteByEndpointAsync(userId, info.Endpoint.Trim());
    }

    public async Task<List<CampaignNotificationInfo>> ListCampaignsAsync(long userId)
    {
        var rows = await _campaignRepository.ListTableAsync(userId);
        var muted = (await _prefRepository.ListByUserAsync(userId)).Where(p => p.Muted).Select(p => p.CampaignId).ToHashSet();
        return rows.Select(r => new CampaignNotificationInfo
        {
            CampaignId = r.CampaignId,
            CampaignName = r.Name,
            Slug = r.Slug,
            Muted = muted.Contains(r.CampaignId)
        }).ToList();
    }

    public async Task<CampaignNotificationInfo> SetMutedAsync(long userId, long campaignId, CampaignNotificationUpdateInfo info)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(campaignId, userId))
            throw new UnauthorizedAccessException("Você não participa desta campanha.");
        var pref = await _prefRepository.GetAsync(userId, campaignId);
        if (pref == null)
        {
            await _prefRepository.InsertAsync(CampaignNotificationPref.Create(userId, campaignId, info.Muted));
        }
        else if (pref.Muted != info.Muted)
        {
            pref.Muted = info.Muted;
            await _prefRepository.UpdateAsync(pref);
        }
        return new CampaignNotificationInfo
        {
            CampaignId = campaign.CampaignId,
            CampaignName = campaign.Name,
            Slug = campaign.Slug,
            Muted = info.Muted
        };
    }

    public async Task<UserNotificationPageInfo> ListInboxAsync(long userId)
    {
        var items = await _inboxRepository.ListByUserAsync(userId, INBOX_SIZE);
        return new UserNotificationPageInfo
        {
            Items = items.Select(n => new UserNotificationInfo
            {
                UserNotificationId = n.UserNotificationId,
                CampaignId = n.CampaignId,
                Kind = n.Kind,
                Title = n.Title,
                Body = n.Body,
                Url = n.Url,
                CreatedAt = n.CreatedAt,
                Read = n.ReadAt.HasValue
            }).ToList(),
            UnreadCount = await _inboxRepository.CountUnreadAsync(userId)
        };
    }

    public Task MarkInboxReadAsync(long userId, UserNotificationReadInfo info) =>
        _inboxRepository.MarkReadAsync(userId, info.UserNotificationId, DateTime.UtcNow);

    public async Task<List<PushDeviceInfo>> ListDevicesAsync(long userId) =>
        (await _subscriptionRepository.ListByUserAsync(userId)).Select(device => new PushDeviceInfo
        {
            PushSubscriptionId = device.PushSubscriptionId,
            Label = DeviceLabel.From(device.UserAgent),
            Endpoint = device.Endpoint,
            CreatedAt = device.CreatedAt,
            LastSuccessAt = device.LastUsedAt,
            FailureCount = device.FailureCount,
            Skipped = device.Skipped
        }).ToList();

    public async Task<PushTestResultInfo> TestAsync(long userId, PushTestInfo info)
    {
        EnsureEnabled();
        var devices = await _subscriptionRepository.ListByUserAsync(userId);
        var endpoint = info.Endpoint?.Trim();
        if (!string.IsNullOrEmpty(endpoint))
        {
            devices = devices.Where(d => d.Endpoint == endpoint).ToList();
            if (devices.Count == 0)
                throw new DomainValidationException("endpoint", "Este aparelho não está registrado para notificações. Ative-as de novo.");
        }
        var payload = Payload(NoticeTexts.TEST_TITLE, NoticeTexts.TEST_BODY, "test", "/", "test");
        return await SendNowAsync(devices, payload, "test");
    }

    public async Task<PushTestResultInfo> SimulateAsync(long userId, long campaignId, NotificationSimulateInfo info)
    {
        var campaign = await GetMasteredAsync(userId, campaignId);
        var kind = info.Kind?.Trim() ?? string.Empty;
        if (!SIMULATED_KINDS.Contains(kind))
            throw new DomainValidationException("kind", $"Tipo de notificação inválido. Use: {string.Join(", ", SIMULATED_KINDS)}.");
        EnsureEnabled();

        var (character, player, other) = await SampleNamesAsync(campaign);
        var (speaker, body) = kind switch
        {
            "message" => (character.Name, "Vamos pela ponte do norte, antes que escureça."),
            "action" => (character.Name, "Ataco o goblin com a espada."),
            "pending" => ((string?)null, NoticeTexts.Pending(new[] { other })),
            "pendingLast" => (null, NoticeTexts.Pending(Array.Empty<string>())),
            "turnFinished" => (null, NoticeTexts.TurnFinished(campaign.CurrentTurn)),
            "life" => (character.Name, NoticeTexts.Life(Math.Max(0, character.Life / 2), character.Life)),
            "fatigue" => (character.Name, NoticeTexts.Fatigue(Math.Max(0, character.Energy / 2), character.Energy)),
            "poke" => (null, NoticeTexts.Poke(player)),
            _ => (null, NoticeTexts.PokeMaster(player))
        };
        var title = NoticeTexts.SimulationTitle(NoticeTexts.Title(speaker, campaign.Name));
        var payload = Payload(title, body, $"campaign:{campaign.CampaignId}:test", $"/campaign/{campaign.Slug}?chat=1", kind);
        // Only the master's own devices; nothing goes to the inbox, the chat or anybody else.
        var devices = await _subscriptionRepository.ListByUserAsync(userId);
        return await SendNowAsync(devices, payload, $"c{campaign.CampaignId}-test");
    }

    public async Task<TurnNoticePreviewInfo> PreviewAsync(long userId, long campaignId)
    {
        var campaign = await GetMasteredAsync(userId, campaignId);
        var approved = (await _campaignCharacterRepository.ListByCampaignAsync(campaignId, approvedOnly: true))
            .Select(p => p.CharacterId).Distinct().ToList();
        var acted = (await _turnRepository.ListByCampaignTurnAsync(campaignId, campaign.CurrentTurn))
            .Where(e => e.TurnType == TurnType.Action && e.CharacterId.HasValue && approved.Contains(e.CharacterId.Value))
            .Select(e => e.CharacterId!.Value)
            .ToHashSet();
        var characters = await _characterRepository.ListByIdsAsync(approved);
        var owners = characters.ToDictionary(c => c.CharacterId, c => c.UserId);
        var users = await _userRepository.ListByIdsAsync(owners.Values.Distinct());
        var names = users.ToDictionary(u => u.UserId, u => NoticeTexts.FirstName(u.Name));
        var bodies = Pending.Reminders(approved, acted, owners, names);
        var threshold = Majority.Threshold(approved.Count);
        var pending = characters.Where(c => !acted.Contains(c.CharacterId))
            .GroupBy(c => c.UserId)
            .Select(g => new TurnNoticePendingInfo
            {
                UserId = g.Key,
                Name = names.TryGetValue(g.Key, out var name) ? name : string.Empty,
                Characters = g.Select(c => c.Name).OrderBy(n => n, StringComparer.CurrentCulture).ToList(),
                Body = bodies.TryGetValue(g.Key, out var body) ? body : null
            })
            .OrderBy(p => p.Name, StringComparer.CurrentCulture)
            .ToList();
        return new TurnNoticePreviewInfo
        {
            TurnNo = campaign.CurrentTurn,
            Approved = approved.Count,
            Acted = acted.Count,
            Threshold = threshold,
            MajorityReached = approved.Count > 0 && acted.Count >= threshold,
            Pending = pending
        };
    }

    private void EnsureEnabled()
    {
        if (!_sender.Enabled)
            throw new ConflictException("As notificações não estão configuradas no servidor.");
    }

    private async Task<Campaign> GetMasteredAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre da campanha pode fazer isso.");
        return campaign;
    }

    /// <summary>A character, its player's first name and another player's, from the table — or made-up ones.</summary>
    private async Task<(Character Character, string Player, string Other)> SampleNamesAsync(Campaign campaign)
    {
        var approved = await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true);
        var characters = (await _characterRepository.ListByIdsAsync(approved.Select(p => p.CharacterId).Distinct()))
            .OrderBy(c => c.Name, StringComparer.CurrentCulture).ToList();
        var users = await _userRepository.ListByIdsAsync(characters.Select(c => c.UserId).Distinct());
        var firstNames = users.OrderBy(u => u.Name, StringComparer.CurrentCulture).Select(u => NoticeTexts.FirstName(u.Name)).ToList();
        var character = characters.FirstOrDefault() ?? new Character { Name = "Aria", Life = 12, Energy = 10 };
        var player = firstNames.FirstOrDefault() ?? "Bruno";
        var other = firstNames.Skip(1).FirstOrDefault() ?? (player == "Bruno" ? "Ana" : "Bruno");
        return (character, player, other);
    }

    private static string Payload(string title, string body, string tag, string url, string kind) =>
        JsonSerializer.Serialize(new { title, body, icon = "/brand/icon-192.png", tag, url, kind, renotify = true }, JSON);

    /// <summary>Sends to each device now and records the answer like the outbox does.</summary>
    private async Task<PushTestResultInfo> SendNowAsync(List<PushSubscription> devices, string payload, string topic)
    {
        var now = _time.GetUtcNow().UtcDateTime;
        var result = new PushTestResultInfo();
        foreach (var device in devices)
        {
            var answer = await _sender.SendAsync(new PushTarget(device.Endpoint, device.P256dh, device.Auth), payload, topic,
                TimeSpan.FromMinutes(10));
            switch (answer)
            {
                case PushSendResult.Sent:
                    await _subscriptionRepository.RecordSuccessAsync(device.PushSubscriptionId, now);
                    break;
                case PushSendResult.Gone:
                    await _subscriptionRepository.DeleteAsync(device.PushSubscriptionId);
                    break;
                default:
                    await _subscriptionRepository.RecordFailureAsync(device.PushSubscriptionId);
                    break;
            }
            result.Devices.Add(new PushTestDeviceInfo
            {
                PushSubscriptionId = device.PushSubscriptionId,
                Label = DeviceLabel.From(device.UserAgent),
                Result = answer switch { PushSendResult.Sent => "sent", PushSendResult.Gone => "gone", _ => "failed" }
            });
        }
        return result;
    }
}
