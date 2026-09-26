using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class CampaignPlanRepository : ICampaignPlanRepository<CampaignPlan>
{
    private readonly Roll6Context _context;

    public CampaignPlanRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<CampaignPlan?> GetByIdAsync(long id)
    {
        return await _context.CampaignPlans.AsNoTracking().FirstOrDefaultAsync(e => e.CampaignPlanId == id);
    }

    public async Task<List<CampaignPlan>> ListByCampaignAsync(long campaignId)
    {
        return await _context.CampaignPlans.AsNoTracking()
            .Where(e => e.CampaignId == campaignId)
            .OrderBy(e => e.CreatedAt).ThenBy(e => e.CampaignPlanId)
            .ToListAsync();
    }

    public async Task<CampaignPlan> InsertAsync(CampaignPlan entity)
    {
        _context.CampaignPlans.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<CampaignPlan> UpdateAsync(CampaignPlan entity)
    {
        var existing = await _context.CampaignPlans.FindAsync(entity.CampaignPlanId)
            ?? throw new KeyNotFoundException("Plano não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.CampaignPlans.FindAsync(id)
            ?? throw new KeyNotFoundException("Plano não encontrado.");
        _context.CampaignPlans.Remove(entity);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteByCampaignAsync(long campaignId)
    {
        await _context.CampaignPlans.Where(e => e.CampaignId == campaignId).ExecuteDeleteAsync();
    }
}
