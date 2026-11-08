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
    Task<MapTokenInfo> SetPostureAsync(long userId, long mapTokenId, MapTokenPostureInfo info);
    Task DeleteAsync(long userId, long mapTokenId);

    /// <summary>The master takes a character or NPC piece to the same hex of another map of the campaign (111).</summary>
    Task<MapTokenMapResultInfo> ChangeMapAsync(long userId, long mapTokenId, MapTokenMapInfo info);

    /// <summary>Whether the user may walk the piece now (069): the hub's check before relaying a walk sample.</summary>
    Task<bool> CanWalkAsync(long userId, long mapTokenId, long campaignId);

    /// <summary>Who sees a piece's walk (108): the master and the owners of the characters on its map.</summary>
    Task<IReadOnlyCollection<long>> ListWalkAudienceAsync(long mapTokenId);

    /// <summary>The names of the pieces sharing a hex, per group, on the campaign's maps (069: leaving free mode).</summary>
    Task<IReadOnlyList<IReadOnlyList<string>>> ListOverlapsAsync(long campaignId);
}
