using Microsoft.EntityFrameworkCore;
using Npgsql;
using SimpleTabletopMap.Domain.Enums;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Infra.Context;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Infra.Repository;

public class MapRepository : IMapRepository<Map>
{
    private const int MAX_INSERT_ATTEMPTS = 2;

    private readonly SimpleTabletopMapContext _context;

    public MapRepository(SimpleTabletopMapContext context)
    {
        _context = context;
    }

    public async Task<Map?> GetByIdAsync(long id)
    {
        return await _context.Maps.AsNoTracking().FirstOrDefaultAsync(e => e.MapId == id);
    }

    public async Task<(List<Map> Items, int TotalCount)> ListByCampaignPagedAsync(long campaignId, int skip, int take)
    {
        var query = _context.Maps.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && e.Status != MapStatus.Deleted);
        var total = await query.CountAsync();
        var items = await query.OrderBy(e => e.Name).ThenBy(e => e.MapId).Skip(skip).Take(take).ToListAsync();
        return (items, total);
    }

    public async Task<Map> InsertWithNextSequenceAsync(Map entity, string mapModelName)
    {
        for (var attempt = 1; ; attempt++)
        {
            var maxSequence = await _context.Maps
                .Where(e => e.CampaignId == entity.CampaignId && e.MapModelId == entity.MapModelId)
                .MaxAsync(e => (int?)e.Sequence) ?? 0;
            entity.Sequence = maxSequence + 1;
            entity.Name = $"{mapModelName} {entity.Sequence}";

            _context.Maps.Add(entity);
            try
            {
                await _context.SaveChangesAsync();
                return entity;
            }
            catch (DbUpdateException ex) when (attempt < MAX_INSERT_ATTEMPTS
                                               && ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                // Another request took the same sequence; recalculate and try again.
                _context.Entry(entity).State = EntityState.Detached;
            }
        }
    }

    public async Task<Map> UpdateAsync(Map entity)
    {
        var existing = await _context.Maps.FindAsync(entity.MapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<int> CountNotDeletedByCampaignAsync(long campaignId)
    {
        return await _context.Maps.CountAsync(e => e.CampaignId == campaignId && e.Status != MapStatus.Deleted);
    }

    public async Task<List<long>> ListDeletedIdsByCampaignAsync(long campaignId)
    {
        return await _context.Maps
            .Where(e => e.CampaignId == campaignId && e.Status == MapStatus.Deleted)
            .Select(e => e.MapId)
            .ToListAsync();
    }

    public async Task DeleteRangeAsync(IEnumerable<long> ids)
    {
        var idList = ids.ToList();
        await _context.Maps.Where(e => idList.Contains(e.MapId)).ExecuteDeleteAsync();
    }

    public async Task<bool> ExistsByMapModelAsync(long mapModelId)
    {
        return await _context.Maps.AnyAsync(e => e.MapModelId == mapModelId);
    }
}
