using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class CampaignNotificationPrefRepository : ICampaignNotificationPrefRepository<CampaignNotificationPref>
{
    private readonly Roll6Context _context;

    public CampaignNotificationPrefRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<CampaignNotificationPref?> GetAsync(long userId, long campaignId)
    {
        return await _context.CampaignNotificationPrefs.AsNoTracking()
            .FirstOrDefaultAsync(e => e.UserId == userId && e.CampaignId == campaignId);
    }

    public async Task<List<CampaignNotificationPref>> ListByUserAsync(long userId)
    {
        return await _context.CampaignNotificationPrefs.AsNoTracking().Where(e => e.UserId == userId).ToListAsync();
    }

    public async Task<List<long>> ListMutedUserIdsAsync(long campaignId)
    {
        return await _context.CampaignNotificationPrefs.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && e.Muted).Select(e => e.UserId).ToListAsync();
    }

    public async Task<CampaignNotificationPref> InsertAsync(CampaignNotificationPref entity)
    {
        _context.CampaignNotificationPrefs.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<CampaignNotificationPref> UpdateAsync(CampaignNotificationPref entity)
    {
        _context.CampaignNotificationPrefs.Update(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task DeleteByCampaignAsync(long campaignId)
    {
        await _context.CampaignNotificationPrefs.Where(e => e.CampaignId == campaignId).ExecuteDeleteAsync();
    }
}
