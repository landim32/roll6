using Roll6.DTO.Common;
using Roll6.DTO.Map;

namespace Roll6.Domain.Interfaces;

public interface IMapService
{
    Task<PagedList<MapInfo>> ListByCampaignAsync(long userId, long campaignId, PageQuery query);
    Task<MapInfo> GetByIdAsync(long userId, long mapId);
    /// <summary>Master or approved participant. Deleted and unknown slugs are 404.</summary>
    Task<MapInfo> GetBySlugAsync(long userId, string slug);
    Task<MapInfo> CreateAsync(long userId, MapInsertInfo info);
    Task<MapInfo> UpdateAsync(long userId, long mapId, MapUpdateInfo info);
    Task DeleteAsync(long userId, long mapId);
}
