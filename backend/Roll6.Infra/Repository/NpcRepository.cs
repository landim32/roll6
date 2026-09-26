using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class NpcRepository : INpcRepository<Npc>
{
    private readonly Roll6Context _context;

    public NpcRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<Npc?> GetByIdAsync(long id)
    {
        return await _context.Npcs.AsNoTracking().FirstOrDefaultAsync(e => e.NpcId == id);
    }

    public async Task<List<Npc>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        return await _context.Npcs.AsNoTracking().Where(e => idList.Contains(e.NpcId)).ToListAsync();
    }

    public async Task<(List<Npc> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long ownerUserId)
    {
        var query = _context.Npcs.AsNoTracking().Where(e => e.UserId == ownerUserId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(e => EF.Functions.ILike(e.Name, pattern));
        }

        var total = await query.CountAsync();
        var items = await query.OrderBy(e => e.Name).ThenBy(e => e.NpcId).Skip(skip).Take(take).ToListAsync();
        return (items, total);
    }

    public async Task<Npc> InsertAsync(Npc entity)
    {
        _context.Npcs.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Npc> UpdateAsync(Npc entity)
    {
        var existing = await _context.Npcs.FindAsync(entity.NpcId)
            ?? throw new KeyNotFoundException("NPC não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        await _context.Npcs.Where(e => e.NpcId == id).ExecuteDeleteAsync();
    }

    public async Task<bool> ExistsByTokenAsync(long tokenId)
    {
        return await _context.Npcs.AnyAsync(e => e.TokenId == tokenId);
    }
}
