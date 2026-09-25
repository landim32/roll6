using SimpleTabletopMap.Domain.Grid;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.DTO.Common;
using SimpleTabletopMap.DTO.MapModel;
using SimpleTabletopMap.Infra.Interfaces.AppServices;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Domain.Services;

public class MapModelService : IMapModelService
{
    private readonly IMapModelRepository<MapModel> _repository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly IImageStorageAppService _imageStorage;

    public MapModelService(
        IMapModelRepository<MapModel> repository,
        IMapRepository<Map> mapRepository,
        IImageStorageAppService imageStorage)
    {
        _repository = repository;
        _mapRepository = mapRepository;
        _imageStorage = imageStorage;
    }

    public async Task<PagedList<MapModelInfo>> ListAsync(PageQuery query, long? ownerUserId = null)
    {
        var (items, total) = await _repository.ListPagedAsync(query.Search, query.Skip, query.PageSize, ownerUserId);
        return new PagedList<MapModelInfo>
        {
            Items = items.Select(MapToDto).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<MapModelInfo> GetByIdAsync(long mapModelId)
    {
        return MapToDto(await GetMapModelAsync(mapModelId));
    }

    public async Task<MapModelInfo> CreateAsync(long userId, MapModelInsertInfo info)
    {
        var mapModel = new MapModel { UserId = userId };
        ApplyChanges(mapModel, info);
        mapModel.CreatedAt = mapModel.ChangedAt;
        return MapToDto(await _repository.InsertAsync(mapModel));
    }

    public async Task<MapModelInfo> UpdateAsync(long userId, long mapModelId, MapModelInsertInfo info)
    {
        var mapModel = await GetOwnedAsync(userId, mapModelId);
        ApplyChanges(mapModel, info);
        return MapToDto(await _repository.UpdateAsync(mapModel));
    }

    public async Task DeleteAsync(long userId, long mapModelId)
    {
        await GetOwnedAsync(userId, mapModelId);
        if (await _mapRepository.ExistsByMapModelAsync(mapModelId))
            throw new ConflictException("O modelo de mapa está em uso por mapas e não pode ser excluído.");
        await _repository.DeleteAsync(mapModelId);
    }

    /// <summary>PUT replaces every field: omitted layout values go back to their defaults.</summary>
    private static void ApplyChanges(MapModel mapModel, MapModelInsertInfo info)
    {
        mapModel.Update(info.Name, info.Description, info.Image);
        mapModel.UpdateGrid(info.GridWidth, info.GridHeight);
        mapModel.UpdateImageLayout(info.ImageWidth, info.ImageHeight, info.ImageTop, info.ImageLeft);
    }

    private async Task<MapModel> GetMapModelAsync(long mapModelId)
    {
        return await _repository.GetByIdAsync(mapModelId)
            ?? throw new KeyNotFoundException("Modelo de mapa não encontrado.");
    }

    private async Task<MapModel> GetOwnedAsync(long userId, long mapModelId)
    {
        var mapModel = await GetMapModelAsync(mapModelId);
        if (mapModel.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono pode alterar ou excluir este modelo de mapa.");
        return mapModel;
    }

    private MapModelInfo MapToDto(MapModel mapModel) => new()
    {
        MapModelId = mapModel.MapModelId,
        UserId = mapModel.UserId,
        Name = mapModel.Name,
        Description = mapModel.Description,
        Image = mapModel.Image,
        ImageUrl = _imageStorage.GetUrl(mapModel.Image),
        GridWidth = mapModel.GridWidth,
        GridHeight = mapModel.GridHeight,
        ImageWidth = mapModel.ImageWidth,
        ImageHeight = mapModel.ImageHeight,
        ImageTop = mapModel.ImageTop,
        ImageLeft = mapModel.ImageLeft,
        HexSize = HexGrid.HEX_SIZE,
        CreatedAt = mapModel.CreatedAt,
        ChangedAt = mapModel.ChangedAt
    };
}
