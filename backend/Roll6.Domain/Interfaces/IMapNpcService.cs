using Roll6.DTO.MapNpc;

namespace Roll6.Domain.Interfaces;

public interface IMapNpcService
{
    Task<List<MapNpcInfo>> ListByMapAsync(long userId, long mapId);
    Task<MapNpcInfo> CreateAsync(long userId, MapNpcInsertInfo info);
    Task<MapNpcInfo> UpdateAsync(long userId, long mapNpcId, MapNpcUpdateInfo info);
    Task DeleteAsync(long userId, long mapNpcId);
}
