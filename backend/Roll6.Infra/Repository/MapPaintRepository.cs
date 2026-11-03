using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class MapPaintRepository : IMapPaintRepository<MapHexMark, MapDrawing>
{
    private readonly Roll6Context _context;

    public MapPaintRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<List<MapHexMark>> ListMarksAsync(long mapId)
    {
        return await _context.MapHexMarks.AsNoTracking()
            .Where(e => e.MapId == mapId)
            .OrderBy(e => e.Y).ThenBy(e => e.X)
            .ToListAsync();
    }

    public async Task<MapHexMark?> GetMarkAsync(long mapId, int x, int y)
    {
        return await _context.MapHexMarks.AsNoTracking()
            .FirstOrDefaultAsync(e => e.MapId == mapId && e.X == x && e.Y == y);
    }

    public async Task ApplyMarksAsync(long mapId, IReadOnlyList<MapHexMark> upserts, IReadOnlyList<(int X, int Y)> removals)
    {
        if (removals.Count > 0)
        {
            var xs = removals.Select(r => r.X).ToArray();
            var ys = removals.Select(r => r.Y).ToArray();
            await _context.Database.ExecuteSqlInterpolatedAsync($@"
                DELETE FROM map_hex_marks m
                USING unnest({xs}::integer[], {ys}::integer[]) AS r(x, y)
                WHERE m.map_id = {mapId} AND m.x = r.x AND m.y = r.y");
        }
        if (upserts.Count > 0)
        {
            // One statement for the whole batch; a concurrent write of the same hex simply wins or loses (last write).
            var xs = upserts.Select(u => u.X).ToArray();
            var ys = upserts.Select(u => u.Y).ToArray();
            var kinds = upserts.Select(u => (int)u.Kind).ToArray();
            var texts = upserts.Select(u => u.Text).ToArray();
            var userIds = upserts.Select(u => u.UserId).ToArray();
            var now = upserts[0].UpdatedAt;
            await _context.Database.ExecuteSqlInterpolatedAsync($@"
                INSERT INTO map_hex_marks (map_id, x, y, kind, text, user_id, created_at, updated_at)
                SELECT {mapId}, u.x, u.y, u.kind, u.text, u.user_id, {now}, {now}
                FROM unnest({xs}::integer[], {ys}::integer[], {kinds}::integer[], {texts}::text[], {userIds}::bigint[])
                    AS u(x, y, kind, text, user_id)
                ON CONFLICT (map_id, x, y) DO UPDATE
                SET kind = EXCLUDED.kind, text = EXCLUDED.text, user_id = EXCLUDED.user_id, updated_at = EXCLUDED.updated_at");
        }
    }

    public async Task<List<MapDrawing>> ListDrawingsAsync(long mapId)
    {
        return await _context.MapDrawings.AsNoTracking()
            .Where(e => e.MapId == mapId)
            .OrderBy(e => e.MapDrawingId)
            .ToListAsync();
    }

    public async Task<int> CountDrawingsAsync(long mapId)
    {
        return await _context.MapDrawings.CountAsync(e => e.MapId == mapId);
    }

    public async Task<MapDrawing> InsertDrawingAsync(MapDrawing drawing)
    {
        _context.MapDrawings.Add(drawing);
        await _context.SaveChangesAsync();
        return drawing;
    }

    public async Task<MapDrawing?> GetDrawingAsync(long mapDrawingId)
    {
        return await _context.MapDrawings.AsNoTracking().FirstOrDefaultAsync(e => e.MapDrawingId == mapDrawingId);
    }

    public async Task DeleteDrawingAsync(long mapDrawingId)
    {
        await _context.MapDrawings.Where(e => e.MapDrawingId == mapDrawingId).ExecuteDeleteAsync();
    }

    public async Task<int> ClearAsync(long mapId)
    {
        var marks = await _context.MapHexMarks.Where(e => e.MapId == mapId).ExecuteDeleteAsync();
        var drawings = await _context.MapDrawings.Where(e => e.MapId == mapId).ExecuteDeleteAsync();
        return marks + drawings;
    }

    public async Task DeleteByMapIdsAsync(IEnumerable<long> mapIds)
    {
        var idList = mapIds.ToList();
        if (idList.Count == 0)
            return;
        await _context.MapHexMarks.Where(e => idList.Contains(e.MapId)).ExecuteDeleteAsync();
        await _context.MapDrawings.Where(e => idList.Contains(e.MapId)).ExecuteDeleteAsync();
    }
}
