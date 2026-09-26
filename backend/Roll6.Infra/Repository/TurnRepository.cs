using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class TurnRepository : ITurnRepository<Turn>
{
    private readonly Roll6Context _context;

    public TurnRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<Turn?> GetByIdAsync(long id)
    {
        return await _context.Turns.AsNoTracking().FirstOrDefaultAsync(e => e.TurnId == id);
    }

    public async Task<List<Turn>> ListByCampaignTurnAsync(long campaignId, int turnNo)
    {
        return await _context.Turns.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && e.TurnNo == turnNo)
            .OrderBy(e => e.CreatedAt).ThenBy(e => e.TurnId)
            .ToListAsync();
    }

    public async Task<List<Turn>> ListByActorTurnAsync(long campaignId, int turnNo, long? characterId, long? mapNpcId)
    {
        return await ActorTurn(campaignId, turnNo, characterId, mapNpcId).AsNoTracking().ToListAsync();
    }

    public async Task<bool> ExistsMovementAsync(long campaignId, int turnNo, long? characterId, long? mapNpcId)
    {
        return await ActorTurn(campaignId, turnNo, characterId, mapNpcId).AnyAsync(e => e.TurnType == TurnType.Movement);
    }

    private IQueryable<Turn> ActorTurn(long campaignId, int turnNo, long? characterId, long? mapNpcId)
    {
        var query = _context.Turns.Where(e => e.CampaignId == campaignId && e.TurnNo == turnNo);
        return characterId.HasValue
            ? query.Where(e => e.CharacterId == characterId)
            : query.Where(e => e.MapNpcId == mapNpcId);
    }

    public async Task<Turn> InsertAsync(Turn entity)
    {
        _context.Turns.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task DeleteAsync(long id)
    {
        await _context.Turns.Where(e => e.TurnId == id).ExecuteDeleteAsync();
    }

    public async Task DeleteRangeAsync(IEnumerable<long> ids)
    {
        var idList = ids.ToList();
        await _context.Turns.Where(e => idList.Contains(e.TurnId)).ExecuteDeleteAsync();
    }

    public async Task DeleteByCampaignAsync(long campaignId)
    {
        await _context.Turns.Where(e => e.CampaignId == campaignId).ExecuteDeleteAsync();
    }

    public async Task DeleteByCharacterAsync(long characterId)
    {
        await _context.Turns.Where(e => e.CharacterId == characterId).ExecuteDeleteAsync();
    }

    public async Task DeleteByNpcAsync(long npcId)
    {
        await _context.Turns.Where(e => e.NpcId == npcId).ExecuteDeleteAsync();
    }

    public async Task DeleteByMapNpcIdsAsync(IEnumerable<long> mapNpcIds)
    {
        var idList = mapNpcIds.Select(id => (long?)id).ToList();
        await _context.Turns.Where(e => idList.Contains(e.MapNpcId)).ExecuteDeleteAsync();
    }
}
