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

    /// <summary>
    /// The turn records (041): what every turn rule and turn read looks at — types 1–5 that were not deleted from the
    /// chat. Conversation and end-of-turn dividers live in the same table but never reach the turn's contracts.
    /// </summary>
    private IQueryable<Turn> Log => _context.Turns.Where(e => TurnTypes.LOG.Contains(e.TurnType) && e.DeletedAt == null);

    /// <summary>Any entry by id, whatever its type (the services decide what may be done with it).</summary>
    public async Task<Turn?> GetByIdAsync(long id)
    {
        return await _context.Turns.AsNoTracking().FirstOrDefaultAsync(e => e.TurnId == id);
    }

    public async Task<List<Turn>> ListByCampaignTurnAsync(long campaignId, int turnNo)
    {
        return await Log.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && e.TurnNo == turnNo)
            .OrderBy(e => e.CreatedAt).ThenBy(e => e.TurnId)
            .ToListAsync();
    }

    public async Task<List<Turn>> ListByCampaignTurnRangeAsync(long campaignId, int fromTurn, int toTurn)
    {
        return await Log.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && e.TurnNo >= fromTurn && e.TurnNo <= toTurn)
            .OrderBy(e => e.TurnNo).ThenBy(e => e.CreatedAt).ThenBy(e => e.TurnId)
            .ToListAsync();
    }

    public async Task<List<Turn>> ListByActorTurnAsync(long campaignId, int turnNo, long? characterId, long? mapNpcId)
    {
        return await ActorTurn(campaignId, turnNo, characterId, mapNpcId).AsNoTracking().ToListAsync();
    }

    public async Task<List<Turn>> ListLastMovementsAsync(long campaignId, int turnNo)
    {
        var lastIds = await Log
            .Where(e => e.CampaignId == campaignId && e.TurnNo <= turnNo && e.TurnType == TurnType.Movement)
            .GroupBy(e => new { e.CharacterId, e.MapNpcId })
            .Select(g => g.Max(e => e.TurnId))
            .ToListAsync();
        return await _context.Turns.AsNoTracking().Where(e => lastIds.Contains(e.TurnId)).ToListAsync();
    }

    public async Task<List<Turn>> ListNarrationsAsync(long campaignId, int? turnNo, int beforeTurn)
    {
        var narrations = Log.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && e.TurnType == TurnType.Narration);
        if (turnNo is int number)
            narrations = narrations.Where(e => e.TurnNo == number);
        else
        {
            var latest = await narrations.Where(e => e.TurnNo < beforeTurn).MaxAsync(e => (int?)e.TurnNo);
            if (latest is null) return new List<Turn>();
            narrations = narrations.Where(e => e.TurnNo == latest);
        }
        return await narrations.OrderBy(e => e.CreatedAt).ThenBy(e => e.TurnId).ToListAsync();
    }

    public async Task<bool> ExistsMovementAsync(long campaignId, int turnNo, long? characterId, long? mapNpcId)
    {
        return await ActorTurn(campaignId, turnNo, characterId, mapNpcId).AnyAsync(e => e.TurnType == TurnType.Movement);
    }

    private IQueryable<Turn> ActorTurn(long campaignId, int turnNo, long? characterId, long? mapNpcId)
    {
        var query = Log.Where(e => e.CampaignId == campaignId && e.TurnNo == turnNo);
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

    public async Task<Turn> UpdateAsync(Turn entity)
    {
        _context.Turns.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    /// <summary>
    /// Turns after <paramref name="turnNo"/> that have anything — chat included (041) — besides their own end-of-turn
    /// divider, which only marks that the turn ended.
    /// </summary>
    public async Task<List<int>> ListTurnNosAfterAsync(long campaignId, int turnNo)
    {
        return await _context.Turns
            .Where(e => e.CampaignId == campaignId && e.TurnNo > turnNo && e.TurnType != TurnType.TurnFinished)
            .Select(e => e.TurnNo).Distinct().OrderBy(n => n)
            .ToListAsync();
    }

    public async Task<int> DeleteAfterTurnAsync(long campaignId, int turnNo)
    {
        return await _context.Turns.Where(e => e.CampaignId == campaignId && e.TurnNo > turnNo).ExecuteDeleteAsync();
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

    /// <summary>
    /// The character's turn records go; what it said in the chat stays (041), no longer linked to the deleted
    /// character but still showing the name and picture it had when sent.
    /// </summary>
    public async Task DeleteByCharacterAsync(long characterId)
    {
        await _context.Turns.Where(e => e.CharacterId == characterId && !TurnTypes.CONVERSATION.Contains(e.TurnType))
            .ExecuteDeleteAsync();
        await _context.Turns.Where(e => e.CharacterId == characterId)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.CharacterId, (long?)null));
    }

    // ------------------------------------------------------------------ chat (041)

    public async Task<List<Turn>> ListChatPageAsync(long campaignId, (DateTime At, long Id)? before, (DateTime At, long Id)? after, int limit)
    {
        var query = _context.Turns.AsNoTracking().Where(e => e.CampaignId == campaignId);
        if (after is { } a)
        {
            return await query.Where(e => e.CreatedAt > a.At || (e.CreatedAt == a.At && e.TurnId > a.Id))
                .OrderBy(e => e.CreatedAt).ThenBy(e => e.TurnId).Take(limit).ToListAsync();
        }
        if (before is { } b)
            query = query.Where(e => e.CreatedAt < b.At || (e.CreatedAt == b.At && e.TurnId < b.Id));
        var page = await query.OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.TurnId).Take(limit).ToListAsync();
        page.Reverse();
        return page;
    }

    public async Task<List<Turn>> ListLogByTurnsAsync(long campaignId, IEnumerable<int> turnNos)
    {
        var numbers = turnNos.Distinct().ToList();
        return await Log.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && numbers.Contains(e.TurnNo))
            .OrderBy(e => e.CreatedAt).ThenBy(e => e.TurnId)
            .ToListAsync();
    }

    public async Task<int> CountUnreadAsync(long campaignId, long userId, DateTime? since, int cap)
    {
        var query = _context.Turns.Where(e => e.CampaignId == campaignId && e.UserId != userId && e.DeletedAt == null);
        if (since is DateTime at)
            query = query.Where(e => e.CreatedAt > at);
        return await query.Take(cap).CountAsync();
    }

    public async Task<DateTime?> LastPokeAtAsync(long campaignId, long userId)
    {
        return await _context.Turns.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && e.UserId == userId && e.TurnType == TurnType.Poke)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => (DateTime?)e.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<Turn?> FirstUnreadAsync(long campaignId, long userId, DateTime? since)
    {
        var query = _context.Turns.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && e.UserId != userId && e.DeletedAt == null);
        if (since is DateTime at)
            query = query.Where(e => e.CreatedAt > at);
        return await query.OrderBy(e => e.CreatedAt).ThenBy(e => e.TurnId).FirstOrDefaultAsync();
    }

    public async Task<List<string>> ListChatMediaAsync(long campaignId)
    {
        var media = await _context.Turns
            .Where(e => e.CampaignId == campaignId && (e.Image != null || e.Audio != null))
            .Select(e => new { e.Image, e.Audio })
            .ToListAsync();
        return media.SelectMany(m => new[] { m.Image, m.Audio }).OfType<string>().ToList();
    }

    public async Task<int> DeleteFinishedFromAsync(long campaignId, int turnNo)
    {
        return await _context.Turns
            .Where(e => e.CampaignId == campaignId && e.TurnType == TurnType.TurnFinished && e.TurnNo >= turnNo)
            .ExecuteDeleteAsync();
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
