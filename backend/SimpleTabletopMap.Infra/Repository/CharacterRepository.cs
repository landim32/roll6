using Microsoft.EntityFrameworkCore;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Infra.Context;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Infra.Repository;

public class CharacterRepository : ICharacterRepository<Character>
{
    private readonly SimpleTabletopMapContext _context;

    public CharacterRepository(SimpleTabletopMapContext context)
    {
        _context = context;
    }

    public async Task<Character?> GetByIdAsync(long id)
    {
        return await _context.Characters.AsNoTracking().FirstOrDefaultAsync(e => e.CharacterId == id);
    }

    public async Task<List<Character>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        return await _context.Characters.AsNoTracking().Where(e => idList.Contains(e.CharacterId)).ToListAsync();
    }

    public async Task<List<Character>> ListByUserAsync(long userId)
    {
        return await _context.Characters.AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderBy(e => e.Name).ThenBy(e => e.CharacterId)
            .ToListAsync();
    }

    public async Task<(List<Character> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take)
    {
        var query = _context.Characters.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(e => EF.Functions.ILike(e.Name, pattern));
        }

        var total = await query.CountAsync();
        var items = await query.OrderBy(e => e.Name).ThenBy(e => e.CharacterId).Skip(skip).Take(take).ToListAsync();
        return (items, total);
    }

    public async Task<Character> InsertAsync(Character entity)
    {
        _context.Characters.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Character> UpdateAsync(Character entity)
    {
        var existing = await _context.Characters.FindAsync(entity.CharacterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.Characters.FindAsync(id)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
        _context.Characters.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
