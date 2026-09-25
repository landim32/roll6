using Roll6.DTO.MapToken;

namespace Roll6.Domain.Interfaces;

public interface IMapTokenService
{
    Task<List<MapTokenInfo>> ListByMapAsync(long userId, long mapId);
    Task<MapTokenInfo> CreateAsync(long userId, MapTokenInsertInfo info);
    Task<MapTokenInfo> UpdateAsync(long userId, long mapTokenId, MapTokenUpdateInfo info);
    Task DeleteAsync(long userId, long mapTokenId);
}
