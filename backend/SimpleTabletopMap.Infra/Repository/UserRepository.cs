using Microsoft.EntityFrameworkCore;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Infra.Context;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Infra.Repository;

public class UserRepository : IUserRepository<User>
{
    private readonly SimpleTabletopMapContext _context;

    public UserRepository(SimpleTabletopMapContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(long id)
    {
        return await _context.Users.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == id);
    }

    public async Task<List<User>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        return await _context.Users.AsNoTracking().Where(e => idList.Contains(e.UserId)).ToListAsync();
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users.AsNoTracking().FirstOrDefaultAsync(e => e.Email == email);
    }

    public async Task<User> InsertAsync(User entity)
    {
        _context.Users.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<User> UpdateAsync(User entity)
    {
        var existing = await _context.Users.FindAsync(entity.UserId)
            ?? throw new KeyNotFoundException($"User {entity.UserId} not found.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }
}
