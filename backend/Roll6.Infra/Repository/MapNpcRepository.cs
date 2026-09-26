using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class MapNpcRepository : IMapNpcRepository<MapNpc>
{
    private readonly Roll6Context _context;

    public MapNpcRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<MapNpc?> GetByIdAsync(long id)
    {
        return await _context.MapNpcs.AsNoTracking().FirstOrDefaultAsync(e => e.MapNpcId == id);
    }

    public async Task<List<MapNpc>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        return await _context.MapNpcs.AsNoTracking().Where(e => idList.Contains(e.MapNpcId)).ToListAsync();
    }

    public async Task<List<MapNpc>> ListByMapAsync(long mapId)
    {
        return await _context.MapNpcs.AsNoTracking()
            .Where(e => e.MapId == mapId)
            .OrderBy(e => e.Name).ThenBy(e => e.MapNpcId)
            .ToListAsync();
    }

    public async Task<List<long>> ListIdsByCampaignAndNpcAsync(long campaignId, long npcId)
    {
        return await _context.MapNpcs
            .Where(e => e.NpcId == npcId && _context.Maps.Any(m => m.MapId == e.MapId && m.CampaignId == campaignId))
            .Select(e => e.MapNpcId)
            .ToListAsync();
    }

    public async Task<MapNpc> InsertAsync(MapNpc entity)
    {
        _context.MapNpcs.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<MapNpc> UpdateAsync(MapNpc entity)
    {
        var existing = await _context.MapNpcs.FindAsync(entity.MapNpcId)
            ?? throw new KeyNotFoundException("NPC do mapa não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        await _context.MapNpcs.Where(e => e.MapNpcId == id).ExecuteDeleteAsync();
    }

    public async Task DeleteRangeAsync(IEnumerable<long> ids)
    {
        var idList = ids.ToList();
        await _context.MapNpcs.Where(e => idList.Contains(e.MapNpcId)).ExecuteDeleteAsync();
    }

    public async Task DeleteByMapIdsAsync(IEnumerable<long> mapIds)
    {
        var idList = mapIds.ToList();
        await _context.MapNpcs.Where(e => idList.Contains(e.MapId)).ExecuteDeleteAsync();
    }
}
