using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.Campaign;
using Roll6.DTO.Common;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

public class CampaignService : ICampaignService
{
    private readonly ICampaignRepository<Campaign> _repository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IUserRepository<User> _userRepository;
    private readonly ICampaignNpcRepository<CampaignNpc> _campaignNpcRepository;
    private readonly IMapNpcRepository<MapNpc> _mapNpcRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITurnRepository<Turn> _turnRepository;
    private readonly IRealtimeNotifier _notifier;
    private readonly ICampaignPlanRepository<CampaignPlan> _campaignPlanRepository;
    private readonly IChatReadRepository<ChatRead> _chatReadRepository;
    private readonly ICampaignNotificationPrefRepository<CampaignNotificationPref> _notificationPrefRepository;
    private readonly IUserNotificationRepository<UserNotification> _inboxRepository;
    private readonly IImageStorageAppService _imageStorage;
    private readonly IMapTokenService _mapTokenService;
    private readonly IGmService _gmService;
    private readonly IGmDispatcher _gmDispatcher;

    public CampaignService(
        ICampaignRepository<Campaign> repository,
        IMapRepository<Map> mapRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IUserRepository<User> userRepository,
        ICampaignNpcRepository<CampaignNpc> campaignNpcRepository,
        IMapNpcRepository<MapNpc> mapNpcRepository,
        IUnitOfWork unitOfWork,
        ITurnRepository<Turn> turnRepository,
        IRealtimeNotifier notifier,
        ICampaignPlanRepository<CampaignPlan> campaignPlanRepository,
        IChatReadRepository<ChatRead> chatReadRepository,
        IImageStorageAppService imageStorage,
        ICampaignNotificationPrefRepository<CampaignNotificationPref> notificationPrefRepository,
        IUserNotificationRepository<UserNotification> inboxRepository,
        IMapTokenService mapTokenService,
        IGmService gmService,
        IGmDispatcher gmDispatcher)
    {
        _gmService = gmService;
        _gmDispatcher = gmDispatcher;
        _mapTokenService = mapTokenService;
        _notificationPrefRepository = notificationPrefRepository;
        _inboxRepository = inboxRepository;
        _chatReadRepository = chatReadRepository;
        _imageStorage = imageStorage;
        _campaignPlanRepository = campaignPlanRepository;
        _notifier = notifier;
        _turnRepository = turnRepository;
        _campaignNpcRepository = campaignNpcRepository;
        _mapNpcRepository = mapNpcRepository;
        _repository = repository;
        _mapRepository = mapRepository;
        _mapTokenRepository = mapTokenRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<PagedList<CampaignInfo>> ListAsync(PageQuery query, long? ownerUserId = null)
    {
        var (items, total) = await _repository.ListPagedAsync(query.Search, query.Skip, query.PageSize, ownerUserId);
        var owners = await GetOwnerNamesAsync(items);
        return new PagedList<CampaignInfo>
        {
            Items = items.Select(c => MapToDto(c, owners)).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<CampaignInfo> GetByIdAsync(long campaignId)
    {
        return await MapToDtoAsync(await GetCampaignAsync(campaignId));
    }

    public async Task<CampaignInfo> GetBySlugAsync(string slug)
    {
        var campaign = await _repository.GetBySlugAsync(slug)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        return await MapToDtoAsync(campaign);
    }

    public async Task<List<CampaignTableInfo>> ListTableAsync(long userId)
    {
        var rows = await _repository.ListTableAsync(userId);
        // 078: the master's combo lists every playable map of the campaigns he masters; players get none.
        var mastered = rows.Where(r => r.UserId == userId).Select(r => r.CampaignId).ToList();
        var maps = (await _mapRepository.ListPlayableByCampaignsAsync(mastered))
            .GroupBy(m => m.CampaignId)
            .ToDictionary(g => g.Key, g => g
                .OrderByDescending(m => m.IsCurrent)
                .ThenBy(m => m.Name, StringComparer.CurrentCultureIgnoreCase)
                .Select(m => new TableMapInfo { MapId = m.MapId, Name = m.Name, Slug = m.Slug, Status = (int)m.Status })
                .ToList());
        return rows.Select(row => new CampaignTableInfo
        {
            CampaignId = row.CampaignId,
            Name = row.Name,
            Slug = row.Slug,
            Status = row.Status,
            FreeMode = row.FreeMode,
            PendingNotice = row.PendingNotice,
            ImageUrl = _imageStorage.GetUrl(row.Image),
            IsMaster = row.UserId == userId,
            CurrentMapId = row.CurrentMapId,
            CurrentMapName = row.CurrentMapName,
            CurrentMapSlug = row.CurrentMapSlug,
            Maps = row.UserId == userId && maps.TryGetValue(row.CampaignId, out var list) ? list : new List<TableMapInfo>()
        }).ToList();
    }

    public async Task<CampaignInfo> CreateAsync(long userId, CampaignInsertInfo info)
    {
        var campaign = new Campaign { UserId = userId };
        campaign.Rename(info.Name);
        campaign.SetOpen(info.Open ?? false);
        campaign.ChangeImage(info.Image);
        // 049: a new campaign is being prepared; the master activates it when the table starts.
        campaign.SetStatus((int)Enums.CampaignStatus.Preparing);
        campaign.CreatedAt = campaign.UpdatedAt;
        return await MapToDtoAsync(await _repository.InsertAsync(campaign));
    }

    public async Task<CampaignInfo> RenameAsync(long userId, long campaignId, CampaignInsertInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        campaign.Rename(info.Name);
        var result = await MapToDtoAsync(await _repository.UpdateAsync(campaign));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_CHANGED, campaignId, userId, data: result));
        return result;
    }

    public async Task<CampaignInfo> SetOpenAsync(long userId, long campaignId, CampaignOpenInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        campaign.SetOpen(info.Open);
        var result = await MapToDtoAsync(await _repository.UpdateAsync(campaign));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_CHANGED, campaignId, userId, data: result));
        return result;
    }

    /// <summary>Changes the status (049, master only); a change reaches the table as <c>campaign.changed</c>.</summary>
    public async Task<CampaignInfo> SetStatusAsync(long userId, long campaignId, CampaignStatusInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        if ((int)campaign.Status == info.Status)
            return await MapToDtoAsync(campaign);
        campaign.SetStatus(info.Status);
        var result = await MapToDtoAsync(await _repository.UpdateAsync(campaign));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_CHANGED, campaignId, userId, data: result));
        return result;
    }

    /// <summary>
    /// Switches the free mode (054, master only, any status). Nothing of the turn changes with it; the table learns
    /// through <c>campaign.changed</c>. Leaving it is refused (409) while pieces of the campaign share a hex — the walk
    /// of 069 lets them overlap, the turns don't (FR-012).
    /// </summary>
    public async Task<CampaignInfo> SetFreeModeAsync(long userId, long campaignId, CampaignFreeModeInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        if (campaign.FreeMode == info.FreeMode)
            return await MapToDtoAsync(campaign);
        if (!info.FreeMode)
        {
            var overlaps = await _mapTokenService.ListOverlapsAsync(campaignId);
            if (overlaps.Count > 0)
                throw new ConflictException(FreeModeOverlapMessage(overlaps));
        }
        campaign.SetFreeMode(info.FreeMode);
        var result = await MapToDtoAsync(await _repository.UpdateAsync(campaign));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_CHANGED, campaignId, userId, data: result));
        return result;
    }

    /// <summary>
    /// Switches the pending notice over the chat (072, master, any status, free mode or not). The same value is a
    /// no-op; a change reaches every screen through <c>campaign.changed</c>.
    /// </summary>
    /// <summary>
    /// Switches the GM mode (096, master, any status). The same value is a no-op; a change reaches every screen through
    /// <c>campaign.changed</c>. On: a turn already complete is handed to the GM at once. Off: a queued or running GM run
    /// of the campaign is stopped.
    /// </summary>
    public async Task<CampaignInfo> SetGmModeAsync(long userId, long campaignId, CampaignGmModeInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        if (campaign.GmMode == info.GmMode)
            return await MapToDtoAsync(campaign);
        campaign.SetGmMode(info.GmMode);
        var result = await MapToDtoAsync(await _repository.UpdateAsync(campaign));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_CHANGED, campaignId, userId, data: result));
        if (info.GmMode)
            await _gmService.CheckAsync(campaignId, "mode-on");
        else
            await _gmDispatcher.StopAsync(campaignId);
        return result;
    }

    public async Task<CampaignInfo> SetPendingNoticeAsync(long userId, long campaignId, CampaignPendingNoticeInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        if (campaign.PendingNotice == info.PendingNotice)
            return await MapToDtoAsync(campaign);
        campaign.SetPendingNotice(info.PendingNotice);
        var result = await MapToDtoAsync(await _repository.UpdateAsync(campaign));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_CHANGED, campaignId, userId, data: result));
        return result;
    }

    /// <summary>
    /// Sets or removes the campaign's picture (090, master, any status). The same value is a no-op; a change reaches
    /// every screen through <c>campaign.changed</c>.
    /// </summary>
    public async Task<CampaignInfo> SetImageAsync(long userId, long campaignId, CampaignImageInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        var image = string.IsNullOrWhiteSpace(info.Image) ? null : info.Image.Trim();
        if (campaign.Image == image)
            return await MapToDtoAsync(campaign);
        campaign.ChangeImage(image);
        var result = await MapToDtoAsync(await _repository.UpdateAsync(campaign));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_CHANGED, campaignId, userId, data: result));
        return result;
    }

    /// <summary>Longest message of the free-mode exit refusal; longer lists end in "…".</summary>
    public const int OVERLAP_MESSAGE_MAX = 300;

    /// <summary>
    /// "Não é possível sair do modo livre: Aria e Borin; Guarda, Guarda 2 e Orc estão no mesmo hex." (069), cut at
    /// <see cref="OVERLAP_MESSAGE_MAX"/> characters.
    /// </summary>
    public static string FreeModeOverlapMessage(IReadOnlyList<IReadOnlyList<string>> groups)
    {
        static string Join(IReadOnlyList<string> names) =>
            names.Count < 2 ? string.Concat(names) : $"{string.Join(", ", names.Take(names.Count - 1))} e {names[^1]}";
        var message = $"Não é possível sair do modo livre: {string.Join("; ", groups.Select(Join))} estão no mesmo hex.";
        return message.Length <= OVERLAP_MESSAGE_MAX ? message : message[..(OVERLAP_MESSAGE_MAX - 1)].TrimEnd() + "…";
    }

    public async Task DeleteAsync(long userId, long campaignId)
    {
        await GetOwnedAsync(userId, campaignId);
        if (await _mapRepository.CountNotDeletedByCampaignAsync(campaignId) > 0)
            throw new ConflictException("A campanha possui mapas ativos ou arquivados e não pode ser excluída.");

        // The chat's photos and audios (041) are referenced only by the campaign's chat: they go with it.
        var chatMedia = await _turnRepository.ListChatMediaAsync(campaignId);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _chatReadRepository.DeleteByCampaignAsync(campaignId);
            await _notificationPrefRepository.DeleteByCampaignAsync(campaignId);
            await _inboxRepository.DeleteByCampaignAsync(campaignId);
            await _turnRepository.DeleteByCampaignAsync(campaignId);
            var deletedMapIds = await _mapRepository.ListDeletedIdsByCampaignAsync(campaignId);
            if (deletedMapIds.Count > 0)
            {
                await _mapTokenRepository.DeleteByMapIdsAsync(deletedMapIds);
                await _mapNpcRepository.DeleteByMapIdsAsync(deletedMapIds);
                await _mapRepository.DeleteRangeAsync(deletedMapIds);
            }
            await _campaignNpcRepository.DeleteByCampaignAsync(campaignId);
            await _campaignPlanRepository.DeleteByCampaignAsync(campaignId);
            await _campaignCharacterRepository.DeleteByCampaignAsync(campaignId);
            await _repository.DeleteAsync(campaignId);
        });
        foreach (var fileName in chatMedia)
        {
            try
            {
                await _imageStorage.DeleteAsync(fileName);
            }
            catch
            {
                // Best effort: the campaign is already gone; a file left behind is only storage.
            }
        }
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.CAMPAIGN_DELETED, campaignId, userId));
    }

    public async Task<bool> CanReadAsync(long userId, long campaignId)
    {
        var campaign = await GetCampaignAsync(campaignId);
        return campaign.UserId == userId || await _campaignCharacterRepository.HasApprovedCharacterAsync(campaignId, userId);
    }

    public async Task<CampaignInfo> SetCurrentMapAsync(long userId, long campaignId, CampaignCurrentMapInfo info)
    {
        var campaign = await GetOwnedAsync(userId, campaignId);
        Map? next = null;
        if (info.MapId is long mapId)
        {
            next = await _mapRepository.GetByIdAsync(mapId)
                ?? throw new KeyNotFoundException("Mapa não encontrado.");
            // Only an active map can be the one the players follow (048: archived maps are refused too).
            if (next.CampaignId != campaignId || !next.IsPlayable)
                throw new DomainValidationException("mapId", "O mapa precisa ser um mapa ativo desta campanha.");
        }
        if (campaign.CurrentMapId == info.MapId && (next == null || next.IsCurrent))
            return await MapToDtoAsync(campaign);

        // 078: the map's status says which one is current. The old one goes back to Active first (the unique index allows
        // one Current per campaign), then the new one, then the campaign's pointer — all or nothing.
        var previous = campaign.CurrentMapId is long previousId && previousId != info.MapId
            ? await _mapRepository.GetByIdAsync(previousId)
            : null;
        Campaign saved = campaign;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (previous is { IsCurrent: true })
            {
                previous.LeaveCurrent();
                await _mapRepository.UpdateAsync(previous);
            }
            if (next is { IsCurrent: false })
            {
                next.MakeCurrent();
                await _mapRepository.UpdateAsync(next);
            }
            campaign.SetCurrentMap(info.MapId);
            saved = await _repository.UpdateAsync(campaign);
        });
        var result = await MapToDtoAsync(saved);
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_CURRENT, campaignId, userId, info.MapId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAPS_CHANGED, campaignId, userId, info.MapId));
        return result;
    }

    private async Task<Campaign> GetCampaignAsync(long campaignId)
    {
        return await _repository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
    }

    private async Task<Campaign> GetOwnedAsync(long userId, long campaignId)
    {
        var campaign = await GetCampaignAsync(campaignId);
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre pode alterar ou excluir esta campanha.");
        return campaign;
    }

    private async Task<Dictionary<long, string>> GetOwnerNamesAsync(IEnumerable<Campaign> campaigns)
    {
        return (await _userRepository.ListByIdsAsync(campaigns.Select(c => c.UserId)))
            .ToDictionary(u => u.UserId, u => u.Name);
    }

    private async Task<CampaignInfo> MapToDtoAsync(Campaign campaign)
    {
        return MapToDto(campaign, await GetOwnerNamesAsync(new[] { campaign }));
    }

    private CampaignInfo MapToDto(Campaign campaign, IReadOnlyDictionary<long, string> ownerNames) => new()
    {
        CampaignId = campaign.CampaignId,
        UserId = campaign.UserId,
        OwnerName = ownerNames.GetValueOrDefault(campaign.UserId, string.Empty),
        Name = campaign.Name,
        Slug = campaign.Slug,
        Open = campaign.Open,
        Status = (int)campaign.Status,
        FreeMode = campaign.FreeMode,
        PendingNotice = campaign.PendingNotice,
        GmMode = campaign.GmMode,
        Image = campaign.Image,
        ImageUrl = _imageStorage.GetUrl(campaign.Image),
        CurrentTurn = campaign.CurrentTurn,
        CurrentMapId = campaign.CurrentMapId,
        CreatedAt = campaign.CreatedAt,
        UpdatedAt = campaign.UpdatedAt
    };
}
