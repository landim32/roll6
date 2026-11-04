using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.Common;
using Roll6.DTO.Map;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

public class MapService : IMapService
{
    private readonly IMapRepository<Map> _repository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IImageStorageAppService _imageStorage;
    private readonly IRealtimeNotifier _notifier;

    public MapService(
        IMapRepository<Map> repository,
        ICampaignRepository<Campaign> campaignRepository,
        IMapModelRepository<MapModel> mapModelRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        IUnitOfWork unitOfWork,
        IImageStorageAppService imageStorage,
        IRealtimeNotifier notifier)
    {
        _notifier = notifier;
        _mapTokenRepository = mapTokenRepository;
        _unitOfWork = unitOfWork;
        _repository = repository;
        _campaignRepository = campaignRepository;
        _mapModelRepository = mapModelRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _imageStorage = imageStorage;
    }

    public async Task<PagedList<MapInfo>> ListByCampaignAsync(long userId, long campaignId, PageQuery query)
    {
        await EnsureCanReadCampaignAsync(userId, campaignId);
        var (items, total) = await _repository.ListByCampaignPagedAsync(campaignId, query.Skip, query.PageSize);
        var mapModels = (await _mapModelRepository.ListByIdsAsync(items.Select(e => e.MapModelId)))
            .ToDictionary(e => e.MapModelId);

        return new PagedList<MapInfo>
        {
            Items = items.Select(map => MapToDto(map, mapModels.GetValueOrDefault(map.MapModelId))).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<MapInfo> GetByIdAsync(long userId, long mapId)
    {
        var map = await GetExistingAsync(mapId);
        await EnsureCanReadCampaignAsync(userId, map.CampaignId);
        return MapToDto(map, await _mapModelRepository.GetByIdAsync(map.MapModelId));
    }

    public async Task<MapInfo> GetBySlugAsync(long userId, string slug)
    {
        var map = await _repository.GetBySlugAsync(slug)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        if (map.IsDeleted)
            throw new KeyNotFoundException("Mapa não encontrado.");
        await EnsureCanReadCampaignAsync(userId, map.CampaignId);
        return MapToDto(map, await _mapModelRepository.GetByIdAsync(map.MapModelId));
    }

    public async Task<MapInfo> CreateAsync(long userId, MapInsertInfo info)
    {
        var campaign = await GetOwnedCampaignAsync(userId, info.CampaignId);
        campaign.EnsureMapEditable(true); // 049: no new map at a paused or finished table
        var mapModel = await _mapModelRepository.GetByIdAsync(info.MapModelId)
            ?? throw new KeyNotFoundException("Modelo de mapa não encontrado.");

        var now = DateTime.UtcNow;
        var map = new Map
        {
            CampaignId = info.CampaignId,
            MapModelId = info.MapModelId,
            UserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };
        var result = MapToDto(await _repository.InsertWithNextSequenceAsync(map, mapModel.Name), mapModel);
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAPS_CHANGED, result.CampaignId, userId, result.MapId, result));
        return result;
    }

    public async Task<MapInfo> UpdateAsync(long userId, long mapId, MapUpdateInfo info)
    {
        var map = await GetOwnedAsync(userId, mapId);
        map.Update(info.Name, info.Status);
        // 108: a character always stands on an active map; an archived one would leave its player without a screen.
        if (map.Status == MapStatus.Archived && await _mapTokenRepository.AnyCharacterOnMapAsync(mapId))
            throw new ConflictException("Há personagens neste mapa. Leve-os para outro mapa antes de arquivar.");
        var updated = await _repository.UpdateAsync(map);
        var result = MapToDto(updated, await _mapModelRepository.GetByIdAsync(updated.MapModelId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAPS_CHANGED, result.CampaignId, userId, result.MapId, result));
        return result;
    }

    public async Task DeleteAsync(long userId, long mapId)
    {
        var map = await GetOwnedAsync(userId, mapId);
        map.MarkDeleted();
        // 108: the characters leave with the map, or they could never be placed again (one piece per character).
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mapTokenRepository.DeleteCharactersByMapAsync(map.MapId);
            await _repository.UpdateAsync(map);
        });
        await AfterDeletedAsync(map, userId);
    }

    /// <summary>Whoever has a deleted map open closes it (017), and its characters are off every map now (108).</summary>
    private async Task AfterDeletedAsync(Map map, long userId)
    {
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_DELETED, map.CampaignId, userId, map.MapId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.PARTY_CHANGED, map.CampaignId, userId));
    }

    /// <summary>Returns the map when it exists, is not deleted and belongs to the user.</summary>
    private async Task<Map> GetExistingAsync(long mapId)
    {
        var map = await _repository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        return map;
    }

    /// <summary>Reading is allowed to the master and to owners of approved characters (feature 005).</summary>
    private async Task EnsureCanReadCampaignAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(campaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os mapas da campanha.");
    }

    private async Task<Map> GetOwnedAsync(long userId, long mapId)
    {
        var map = await GetExistingAsync(mapId);
        if (map.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono pode acessar este mapa.");
        return map;
    }

    private async Task<Campaign> GetOwnedCampaignAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono da campanha pode acessar seus mapas.");
        return campaign;
    }

    private MapInfo MapToDto(Map map, MapModel? mapModel) => new()
    {
        MapId = map.MapId,
        CampaignId = map.CampaignId,
        MapModelId = map.MapModelId,
        MapModelName = mapModel?.Name ?? string.Empty,
        MapModelImageUrl = _imageStorage.GetUrl(mapModel?.Image),
        GridWidth = mapModel?.GridWidth ?? 0,
        GridHeight = mapModel?.GridHeight ?? 0,
        ImageWidth = mapModel?.ImageWidth,
        ImageHeight = mapModel?.ImageHeight,
        ImageTop = mapModel?.ImageTop ?? 0,
        ImageLeft = mapModel?.ImageLeft ?? 0,
        HexSize = HexGrid.HEX_SIZE,
        UserId = map.UserId,
        Sequence = map.Sequence,
        Name = map.Name,
        Slug = map.Slug,
        Status = (int)map.Status,
        CreatedAt = map.CreatedAt,
        UpdatedAt = map.UpdatedAt
    };
}
