using Roll6.DTO.MapToken;

namespace Roll6.Domain.Interfaces;

public interface IMapTokenService
{
    Task<List<MapTokenInfo>> ListByMapAsync(long userId, long mapId);
    Task<MapTokenInfo> CreateAsync(long userId, MapTokenInsertInfo info);
    Task<MapTokenInfo> PlaceCharacterAsync(long userId, MapTokenCharacterInsertInfo info);
    Task<MapTokenInfo> UpdateAsync(long userId, long mapTokenId, MapTokenUpdateInfo info);
    Task<MapTokenInfo> MoveAsync(long userId, long mapTokenId, MapTokenPositionInfo info);
    Task<MapTokenInfo> ChangeTokenAsync(long userId, long mapTokenId, MapTokenTokenInfo info);
    Task DeleteAsync(long userId, long mapTokenId);
}
