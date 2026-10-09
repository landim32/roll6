using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Push;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>Web Push subscriptions and per-campaign mute (043). Delivery itself is the notification worker's.</summary>
public class PushService : IPushService
{
    private readonly IPushSubscriptionRepository<PushSubscription> _subscriptionRepository;
    private readonly ICampaignNotificationPrefRepository<CampaignNotificationPref> _prefRepository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IPushSender _sender;

    public PushService(
        IPushSubscriptionRepository<PushSubscription> subscriptionRepository,
        ICampaignNotificationPrefRepository<CampaignNotificationPref> prefRepository,
        ICampaignRepository<Campaign> campaignRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IPushSender sender)
    {
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
}
