using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class TokenRepository : ITokenRepository<Token>
{
    private readonly Roll6Context _context;

    public TokenRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<Token?> GetByIdAsync(long id)
    {
        return await _context.Tokens.AsNoTracking().FirstOrDefaultAsync(e => e.TokenId == id);
    }

    public async Task<List<Token>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        return await _context.Tokens.AsNoTracking().Where(e => idList.Contains(e.TokenId)).ToListAsync();
    }

    public async Task<(List<Token> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long? ownerUserId)
    {
        var query = _context.Tokens.AsNoTracking();
        if (ownerUserId.HasValue)
            query = query.Where(e => e.UserId == ownerUserId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(e => EF.Functions.ILike(e.Name, pattern)
                                     || (e.Description != null && EF.Functions.ILike(e.Description, pattern)));
        }

        var total = await query.CountAsync();
        var items = await query.OrderBy(e => e.Name).ThenBy(e => e.TokenId).Skip(skip).Take(take).ToListAsync();
        return (items, total);
    }

    public async Task<Token> InsertAsync(Token entity)
    {
        _context.Tokens.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Token> UpdateAsync(Token entity)
    {
        var existing = await _context.Tokens.FindAsync(entity.TokenId)
            ?? throw new KeyNotFoundException("Token não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.Tokens.FindAsync(id)
            ?? throw new KeyNotFoundException("Token não encontrado.");
        _context.Tokens.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
