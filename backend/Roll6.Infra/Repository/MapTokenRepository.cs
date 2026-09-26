using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class MapTokenRepository : IMapTokenRepository<MapToken>
{
    private readonly Roll6Context _context;

    public MapTokenRepository(Roll6Context context)
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

    public async Task<MapToken?> GetByMapAndCampaignCharacterAsync(long mapId, long campaignCharacterId)
    {
        return await _context.MapTokens.AsNoTracking()
            .FirstOrDefaultAsync(e => e.MapId == mapId && e.CampaignCharacterId == campaignCharacterId);
    }

    public async Task<bool> ExistsAtAsync(long mapId, int x, int y, long? exceptMapTokenId)
    {
        return await _context.MapTokens.AnyAsync(e => e.MapId == mapId && e.X == x && e.Y == y
                                                      && (exceptMapTokenId == null || e.MapTokenId != exceptMapTokenId));
    }

    public async Task DeleteByCampaignCharacterAsync(long campaignCharacterId)
    {
        await _context.MapTokens.Where(e => e.CampaignCharacterId == campaignCharacterId).ExecuteDeleteAsync();
    }

    public async Task<MapToken?> GetByMapNpcIdAsync(long mapNpcId)
    {
        return await _context.MapTokens.AsNoTracking().FirstOrDefaultAsync(e => e.MapNpcId == mapNpcId);
    }

    public async Task<List<MapToken>> ListByMapNpcIdsAsync(IEnumerable<long> mapNpcIds)
    {
        var idList = mapNpcIds.Select(id => (long?)id).ToList();
        return await _context.MapTokens.AsNoTracking().Where(e => idList.Contains(e.MapNpcId)).ToListAsync();
    }

    public async Task DeleteByMapNpcIdsAsync(IEnumerable<long> mapNpcIds)
    {
        var idList = mapNpcIds.Select(id => (long?)id).ToList();
        await _context.MapTokens.Where(e => idList.Contains(e.MapNpcId)).ExecuteDeleteAsync();
    }

    public async Task DeleteByCharacterAsync(long characterId)
    {
        await _context.MapTokens
            .Where(e => _context.CampaignCharacters.Any(c => c.CampaignCharacterId == e.CampaignCharacterId && c.CharacterId == characterId))
            .ExecuteDeleteAsync();
    }
}
