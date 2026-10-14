using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class AnimationRepository : IAnimationRepository<Animation>
{
    private readonly Roll6Context _context;

    public AnimationRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<Animation?> GetByIdAsync(long id)
    {
        return await _context.Animations.AsNoTracking().FirstOrDefaultAsync(e => e.AnimationId == id);
    }

    public async Task<List<Animation>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        return await _context.Animations.AsNoTracking().Where(e => idList.Contains(e.AnimationId)).ToListAsync();
    }

    public async Task<(List<Animation> Items, int TotalCount)> ListPagedAsync(
        string? search, int skip, int take, long? ownerUserId, int? type, long viewerUserId)
    {
        var query = _context.Animations.AsNoTracking();
        if (ownerUserId.HasValue)
            query = query.Where(e => e.UserId == ownerUserId.Value);
        if (type.HasValue)
        {
            var animationType = (AnimationType)type.Value;
            query = query.Where(e => e.AnimationType == animationType);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(e => EF.Functions.ILike(e.Name, pattern));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(e => e.UserId == viewerUserId ? 0 : 1)
            .ThenBy(e => e.Name)
            .ThenBy(e => e.AnimationId)
            .Skip(skip).Take(take).ToListAsync();
        return (items, total);
    }

    public async Task<Animation> InsertAsync(Animation entity)
    {
        _context.Animations.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Animation> UpdateAsync(Animation entity)
    {
        var existing = await _context.Animations.FindAsync(entity.AnimationId)
            ?? throw new KeyNotFoundException("Animação não encontrada.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.Animations.FindAsync(id)
            ?? throw new KeyNotFoundException("Animação não encontrada.");
        _context.Animations.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
