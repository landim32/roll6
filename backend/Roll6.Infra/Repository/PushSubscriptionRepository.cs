using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
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
        return await _context.PushSubscriptions.AsNoTracking()
            .Where(e => userIds.Contains(e.UserId) && e.FailureCount < PushPolicy.MAX_FAILURES)
            .ToListAsync();
    }

    public async Task<List<PushSubscription>> ListByUserAsync(long userId)
    {
        return await _context.PushSubscriptions.AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.LastUsedAt ?? e.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<PushSubscription>> ListByIdsAsync(IReadOnlyCollection<long> pushSubscriptionIds)
    {
        return await _context.PushSubscriptions.AsNoTracking()
            .Where(e => pushSubscriptionIds.Contains(e.PushSubscriptionId))
            .ToListAsync();
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
        // The outbox points to the device and FKs never cascade.
        await _context.PushDeliveries.Where(e => e.PushSubscriptionId == pushSubscriptionId).ExecuteDeleteAsync();
        await _context.PushSubscriptions.Where(e => e.PushSubscriptionId == pushSubscriptionId).ExecuteDeleteAsync();
    }

    public async Task<bool> DeleteByEndpointAsync(long userId, string endpoint)
    {
        var ids = await _context.PushSubscriptions.Where(e => e.UserId == userId && e.Endpoint == endpoint)
            .Select(e => e.PushSubscriptionId).ToListAsync();
        if (ids.Count == 0)
            return false;
        await _context.PushDeliveries.Where(e => ids.Contains(e.PushSubscriptionId)).ExecuteDeleteAsync();
        return await _context.PushSubscriptions.Where(e => ids.Contains(e.PushSubscriptionId)).ExecuteDeleteAsync() > 0;
    }

    public async Task RecordSuccessAsync(long pushSubscriptionId, DateTime at)
    {
        await _context.PushSubscriptions.Where(e => e.PushSubscriptionId == pushSubscriptionId)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.LastUsedAt, at).SetProperty(e => e.FailureCount, 0));
    }

    public async Task<int> RecordFailureAsync(long pushSubscriptionId)
    {
        var rows = await _context.PushSubscriptions.Where(e => e.PushSubscriptionId == pushSubscriptionId)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.FailureCount, e => e.FailureCount + 1));
        if (rows == 0)
            return 0;
        return await _context.PushSubscriptions.Where(e => e.PushSubscriptionId == pushSubscriptionId)
            .Select(e => e.FailureCount).FirstAsync();
    }
}
