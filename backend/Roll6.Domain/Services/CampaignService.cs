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
        IUserNotificationRepository<UserNotification> inboxRepository)
    {
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
        return rows.Select(row => new CampaignTableInfo
        {
            CampaignId = row.CampaignId,
            Name = row.Name,
            Slug = row.Slug,
            IsMaster = row.UserId == userId,
            CurrentMapId = row.CurrentMapId,
            CurrentMapName = row.CurrentMapName,
            CurrentMapSlug = row.CurrentMapSlug
        }).ToList();
    }

    public async Task<CampaignInfo> CreateAsync(long userId, CampaignInsertInfo info)
    {
        var campaign = new Campaign { UserId = userId };
        campaign.Rename(info.Name);
        campaign.SetOpen(info.Open ?? false);
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
        if (info.MapId is long mapId)
        {
            var map = await _mapRepository.GetByIdAsync(mapId)
                ?? throw new KeyNotFoundException("Mapa não encontrado.");
            // Only an active map can be the one the players follow (048: archived maps are refused too).
            if (map.CampaignId != campaignId || map.Status != Enums.MapStatus.Active)
                throw new DomainValidationException("mapId", "O mapa precisa ser um mapa ativo desta campanha.");
        }
        if (campaign.CurrentMapId == info.MapId)
            return await MapToDtoAsync(campaign);

        campaign.SetCurrentMap(info.MapId);
        var result = await MapToDtoAsync(await _repository.UpdateAsync(campaign));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_CURRENT, campaignId, userId, info.MapId));
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

    private static CampaignInfo MapToDto(Campaign campaign, IReadOnlyDictionary<long, string> ownerNames) => new()
    {
        CampaignId = campaign.CampaignId,
        UserId = campaign.UserId,
        OwnerName = ownerNames.GetValueOrDefault(campaign.UserId, string.Empty),
        Name = campaign.Name,
        Slug = campaign.Slug,
        Open = campaign.Open,
        CurrentTurn = campaign.CurrentTurn,
        CurrentMapId = campaign.CurrentMapId,
        CreatedAt = campaign.CreatedAt,
        UpdatedAt = campaign.UpdatedAt
    };
}
