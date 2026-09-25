using Microsoft.EntityFrameworkCore;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Infra.Context;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Infra.Repository;

public class MapModelRepository : IMapModelRepository<MapModel>
{
    private readonly SimpleTabletopMapContext _context;

    public MapModelRepository(SimpleTabletopMapContext context)
    {
        _context = context;
    }

    public async Task<MapModel?> GetByIdAsync(long id)
    {
        return await _context.MapModels.AsNoTracking().FirstOrDefaultAsync(e => e.MapModelId == id);
    }

    public async Task<List<MapModel>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        return await _context.MapModels.AsNoTracking().Where(e => idList.Contains(e.MapModelId)).ToListAsync();
    }

    public async Task<(List<MapModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long? ownerUserId)
    {
        var query = _context.MapModels.AsNoTracking();
        if (ownerUserId.HasValue)
            query = query.Where(e => e.UserId == ownerUserId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(e => EF.Functions.ILike(e.Name, pattern)
                                     || (e.Description != null && EF.Functions.ILike(e.Description, pattern)));
        }

        var total = await query.CountAsync();
        var items = await query.OrderBy(e => e.Name).ThenBy(e => e.MapModelId).Skip(skip).Take(take).ToListAsync();
        return (items, total);
    }

    public async Task<MapModel> InsertAsync(MapModel entity)
    {
        _context.MapModels.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<MapModel> UpdateAsync(MapModel entity)
    {
        var existing = await _context.MapModels.FindAsync(entity.MapModelId)
            ?? throw new KeyNotFoundException("Modelo de mapa não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.MapModels.FindAsync(id)
            ?? throw new KeyNotFoundException("Modelo de mapa não encontrado.");
        _context.MapModels.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
