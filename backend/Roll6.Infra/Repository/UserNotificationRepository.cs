using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class UserNotificationRepository : IUserNotificationRepository<UserNotification>
{
    private readonly Roll6Context _context;

    public UserNotificationRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task InsertRangeAsync(IEnumerable<UserNotification> entities)
    {
        _context.UserNotifications.AddRange(entities);
        await _context.SaveChangesAsync();
    }

    public async Task<List<UserNotification>> ListByUserAsync(long userId, int limit)
    {
        return await _context.UserNotifications.AsNoTracking().Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.UserNotificationId).Take(limit).ToListAsync();
    }

    public async Task<int> CountUnreadAsync(long userId)
    {
        return await _context.UserNotifications.CountAsync(n => n.UserId == userId && n.ReadAt == null);
    }

    public async Task MarkReadAsync(long userId, long? id, DateTime at)
    {
        await _context.UserNotifications
            .Where(n => n.UserId == userId && n.ReadAt == null && (id == null || n.UserNotificationId == id))
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, at));
    }

    public async Task DeleteByCampaignAsync(long campaignId)
    {
        await _context.UserNotifications.Where(n => n.CampaignId == campaignId).ExecuteDeleteAsync();
    }
}
