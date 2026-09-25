using SimpleTabletopMap.DTO.Common;
using SimpleTabletopMap.DTO.MapModel;

namespace SimpleTabletopMap.Domain.Interfaces;

public interface IMapModelService
{
    /// <summary>Library of all users, or only the maps of <paramref name="ownerUserId"/>.</summary>
    Task<PagedList<MapModelInfo>> ListAsync(PageQuery query, long? ownerUserId = null);
    Task<MapModelInfo> GetByIdAsync(long mapModelId);
    Task<MapModelInfo> CreateAsync(long userId, MapModelInsertInfo info);
    Task<MapModelInfo> UpdateAsync(long userId, long mapModelId, MapModelInsertInfo info);
    Task DeleteAsync(long userId, long mapModelId);
}
