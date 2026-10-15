using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class PushDeliveryRepository : IPushDeliveryRepository<PushDelivery>
{
    private readonly Roll6Context _context;

    public PushDeliveryRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task InsertRangeAsync(IReadOnlyCollection<PushDelivery> deliveries)
    {
        if (deliveries.Count == 0)
            return;
        _context.PushDeliveries.AddRange(deliveries);
        await _context.SaveChangesAsync();
        foreach (var delivery in deliveries)
            _context.Entry(delivery).State = EntityState.Detached;
    }

    public async Task<List<PushDelivery>> ListDueAsync(DateTime now, int limit)
    {
        return await _context.PushDeliveries.AsNoTracking()
            .Where(e => e.NextAttemptAt <= now)
            .OrderBy(e => e.NextAttemptAt).ThenBy(e => e.PushDeliveryId)
            .Take(limit)
            .ToListAsync();
    }

    public async Task UpdateAsync(PushDelivery delivery)
    {
        await _context.PushDeliveries.Where(e => e.PushDeliveryId == delivery.PushDeliveryId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.Attempts, delivery.Attempts)
                .SetProperty(e => e.NextAttemptAt, delivery.NextAttemptAt));
    }

    public async Task DeleteAsync(long pushDeliveryId)
    {
        await _context.PushDeliveries.Where(e => e.PushDeliveryId == pushDeliveryId).ExecuteDeleteAsync();
    }

    public async Task DeleteBySubscriptionAsync(long pushSubscriptionId)
    {
        await _context.PushDeliveries.Where(e => e.PushSubscriptionId == pushSubscriptionId).ExecuteDeleteAsync();
    }

    public async Task<int> DeleteExpiredAsync(DateTime now)
    {
        return await _context.PushDeliveries.Where(e => e.ExpiresAt <= now).ExecuteDeleteAsync();
    }
}
