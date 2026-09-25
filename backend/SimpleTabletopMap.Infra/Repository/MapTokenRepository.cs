using Microsoft.EntityFrameworkCore;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Infra.Context;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Infra.Repository;

public class MapTokenRepository : IMapTokenRepository<MapToken>
{
    private readonly SimpleTabletopMapContext _context;

    public MapTokenRepository(SimpleTabletopMapContext context)
    {
        _context = context;
    }

    public async Task<MapToken?> GetByIdAsync(long id)
    {
        return await _context.MapTokens.AsNoTracking().FirstOrDefaultAsync(e => e.MapTokenId == id);
    }

    public async Task<List<MapToken>> ListByMapAsync(long mapId)
    {
        return await _context.MapTokens.AsNoTracking()
            .Where(e => e.MapId == mapId)
            .OrderBy(e => e.Name).ThenBy(e => e.MapTokenId)
            .ToListAsync();
    }

    public async Task<MapToken> InsertAsync(MapToken entity)
    {
        _context.MapTokens.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<MapToken> UpdateAsync(MapToken entity)
    {
        var existing = await _context.MapTokens.FindAsync(entity.MapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.MapTokens.FindAsync(id)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        _context.MapTokens.Remove(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsByTokenAsync(long tokenId)
    {
        return await _context.MapTokens.AnyAsync(e => e.TokenId == tokenId);
    }

    public async Task DeleteByMapIdsAsync(IEnumerable<long> mapIds)
    {
        var idList = mapIds.ToList();
        await _context.MapTokens.Where(e => idList.Contains(e.MapId)).ExecuteDeleteAsync();
    }
}
