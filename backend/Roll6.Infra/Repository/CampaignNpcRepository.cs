using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class CampaignNpcRepository : ICampaignNpcRepository<CampaignNpc>
{
    private readonly Roll6Context _context;

    public CampaignNpcRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<CampaignNpc?> GetByIdAsync(long id)
    {
        return await _context.CampaignNpcs.AsNoTracking().FirstOrDefaultAsync(e => e.CampaignNpcId == id);
    }

    public async Task<CampaignNpc?> GetAsync(long campaignId, long npcId)
    {
        return await _context.CampaignNpcs.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CampaignId == campaignId && e.NpcId == npcId);
    }

    public async Task<List<CampaignNpc>> ListByCampaignAsync(long campaignId)
    {
        return await _context.CampaignNpcs.AsNoTracking()
            .Where(e => e.CampaignId == campaignId)
            .OrderBy(e => e.CampaignNpcId)
            .ToListAsync();
    }

    public async Task<bool> ExistsByNpcAsync(long npcId)
    {
        return await _context.CampaignNpcs.AnyAsync(e => e.NpcId == npcId);
    }

    public async Task<CampaignNpc> InsertAsync(CampaignNpc entity)
    {
        _context.CampaignNpcs.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task DeleteAsync(long id)
    {
        await _context.CampaignNpcs.Where(e => e.CampaignNpcId == id).ExecuteDeleteAsync();
    }

    public async Task DeleteByCampaignAsync(long campaignId)
    {
        await _context.CampaignNpcs.Where(e => e.CampaignId == campaignId).ExecuteDeleteAsync();
    }
}
