using Roll6.DTO.Map;

namespace Roll6.Domain.Interfaces;

/// <summary>
/// The paint of a campaign map (107): hex marks and drawings, plus what is on one hex. The master writes (while the
/// map may be edited, 049); the master and approved participants read. Every change publishes <c>mapPaint.changed</c>.
/// </summary>
public interface IMapPaintService
{
    Task<MapPaintInfo> GetPaintAsync(long userId, long mapId);
    Task<MapPaintChangeInfo> SetHexMarksAsync(long userId, long mapId, MapHexMarksInfo info);
    Task<MapDrawingInfo> AddDrawingAsync(long userId, long mapId, MapDrawingInsertInfo info);
    Task DeleteDrawingAsync(long userId, long mapId, long mapDrawingId);
    Task ClearAsync(long userId, long mapId);
    Task<HexContentInfo> GetHexContentAsync(long userId, long mapId, int x, int y);
}
