using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class PushSubscriptionRepository : IPushSubscriptionRepository<PushSubscription>
{
    private readonly Roll6Context _context;

    public PushSubscriptionRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<PushSubscription?> GetByEndpointAsync(string endpoint)
    {
        return await _context.PushSubscriptions.AsNoTracking().FirstOrDefaultAsync(e => e.Endpoint == endpoint);
    }

    public async Task<List<PushSubscription>> ListByUsersAsync(IReadOnlyCollection<long> userIds)
    {
        return await _context.PushSubscriptions.AsNoTracking().Where(e => userIds.Contains(e.UserId)).ToListAsync();
    }

    public async Task<PushSubscription> InsertAsync(PushSubscription entity)
    {
        _context.PushSubscriptions.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<PushSubscription> UpdateAsync(PushSubscription entity)
    {
        _context.PushSubscriptions.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task DeleteAsync(long pushSubscriptionId)
    {
        await _context.PushSubscriptions.Where(e => e.PushSubscriptionId == pushSubscriptionId).ExecuteDeleteAsync();
    }

    public async Task<bool> DeleteByEndpointAsync(long userId, string endpoint)
    {
        return await _context.PushSubscriptions.Where(e => e.UserId == userId && e.Endpoint == endpoint).ExecuteDeleteAsync() > 0;
    }

    public async Task TouchAsync(long pushSubscriptionId, DateTime at)
    {
        await _context.PushSubscriptions.Where(e => e.PushSubscriptionId == pushSubscriptionId)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.LastUsedAt, at));
    }
}
