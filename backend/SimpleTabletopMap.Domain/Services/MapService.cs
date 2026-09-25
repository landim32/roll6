using SimpleTabletopMap.Domain.Grid;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.DTO.Common;
using SimpleTabletopMap.DTO.Map;
using SimpleTabletopMap.Infra.Interfaces.AppServices;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Domain.Services;

public class MapService : IMapService
{
    private readonly IMapRepository<Map> _repository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IImageStorageAppService _imageStorage;

    public MapService(
        IMapRepository<Map> repository,
        ICampaignRepository<Campaign> campaignRepository,
        IMapModelRepository<MapModel> mapModelRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IImageStorageAppService imageStorage)
    {
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

    public async Task<MapInfo> CreateAsync(long userId, MapInsertInfo info)
    {
        await GetOwnedCampaignAsync(userId, info.CampaignId);
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
        return MapToDto(await _repository.InsertWithNextSequenceAsync(map, mapModel.Name), mapModel);
    }

    public async Task<MapInfo> UpdateAsync(long userId, long mapId, MapUpdateInfo info)
    {
        var map = await GetOwnedAsync(userId, mapId);
        map.Update(info.Name, info.Status);
        var updated = await _repository.UpdateAsync(map);
        return MapToDto(updated, await _mapModelRepository.GetByIdAsync(updated.MapModelId));
    }

    public async Task DeleteAsync(long userId, long mapId)
    {
        var map = await GetOwnedAsync(userId, mapId);
        map.MarkDeleted();
        await _repository.UpdateAsync(map);
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

    private async Task GetOwnedCampaignAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono da campanha pode acessar seus mapas.");
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
        Status = (int)map.Status,
        CreatedAt = map.CreatedAt,
        UpdatedAt = map.UpdatedAt
    };
}
