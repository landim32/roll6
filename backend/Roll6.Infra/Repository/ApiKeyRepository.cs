using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class ApiKeyRepository : IApiKeyRepository<ApiKey>
{
    private readonly Roll6Context _context;

    public ApiKeyRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<ApiKey?> GetByIdAsync(long id)
    {
        return await _context.ApiKeys.AsNoTracking().FirstOrDefaultAsync(e => e.ApiKeyId == id);
    }

    public async Task<ApiKey?> GetByHashAsync(string keyHash)
    {
        return await _context.ApiKeys.AsNoTracking().FirstOrDefaultAsync(e => e.KeyHash == keyHash);
    }

    public async Task<List<ApiKey>> ListByUserAsync(long userId)
    {
        return await _context.ApiKeys.AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.ApiKeyId)
            .ToListAsync();
    }

    public async Task<int> CountActiveByUserAsync(long userId, DateTime now)
    {
        return await _context.ApiKeys.CountAsync(e => e.UserId == userId && e.RevokedAt == null
                                                      && (e.ExpiresAt == null || e.ExpiresAt > now));
    }

    public async Task<ApiKey> InsertAsync(ApiKey entity)
    {
        _context.ApiKeys.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<ApiKey> UpdateAsync(ApiKey entity)
    {
        var existing = await _context.ApiKeys.FindAsync(entity.ApiKeyId)
            ?? throw new KeyNotFoundException("Chave de API não encontrada.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.ApiKeys.FindAsync(id)
            ?? throw new KeyNotFoundException("Chave de API não encontrada.");
        _context.ApiKeys.Remove(entity);
        await _context.SaveChangesAsync();
    }

    public async Task TouchLastUsedAsync(long id, DateTime now)
    {
        await _context.ApiKeys.Where(e => e.ApiKeyId == id)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.LastUsedAt, now));
    }
}
