using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class WeaponRepository : IWeaponRepository<Weapon>
{
    private readonly Roll6Context _context;

    public WeaponRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<Weapon?> GetByIdAsync(long id)
    {
        return await _context.Weapons.AsNoTracking().FirstOrDefaultAsync(e => e.WeaponId == id);
    }

    public async Task<List<Weapon>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0)
            return new List<Weapon>();
        return await _context.Weapons.AsNoTracking().Where(e => idList.Contains(e.WeaponId)).ToListAsync();
    }

    public async Task<(List<Weapon> Items, int TotalCount)> ListPagedAsync(
        string? search, int skip, int take, long? ownerUserId, long viewerUserId)
    {
        var query = _context.Weapons.AsNoTracking();
        if (ownerUserId.HasValue)
            query = query.Where(e => e.UserId == ownerUserId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(e => EF.Functions.ILike(e.Name, pattern));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(e => e.UserId == viewerUserId ? 0 : 1)
            .ThenBy(e => e.Name)
            .ThenBy(e => e.WeaponId)
            .Skip(skip).Take(take).ToListAsync();
        return (items, total);
    }

    public async Task<Weapon> InsertAsync(Weapon entity)
    {
        _context.Weapons.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Weapon> UpdateAsync(Weapon entity)
    {
        var existing = await _context.Weapons.FindAsync(entity.WeaponId)
            ?? throw new KeyNotFoundException("Arma não encontrada.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.Weapons.FindAsync(id)
            ?? throw new KeyNotFoundException("Arma não encontrada.");
        _context.Weapons.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
