using Microsoft.EntityFrameworkCore;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.Infra.Context;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Infra.Repository;

public class CampaignRepository : ICampaignRepository<Campaign>
{
    private readonly SimpleTabletopMapContext _context;

    public CampaignRepository(SimpleTabletopMapContext context)
    {
        _context = context;
    }

    public async Task<Campaign?> GetByIdAsync(long id)
    {
        return await _context.Campaigns.AsNoTracking().FirstOrDefaultAsync(e => e.CampaignId == id);
    }

    public async Task<List<Campaign>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.Distinct().ToList();
        return await _context.Campaigns.AsNoTracking().Where(e => idList.Contains(e.CampaignId)).ToListAsync();
    }

    public async Task<(List<Campaign> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long? ownerUserId)
    {
        var query = _context.Campaigns.AsNoTracking();
        if (ownerUserId.HasValue)
            query = query.Where(e => e.UserId == ownerUserId.Value);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e => EF.Functions.ILike(e.Name, $"%{search.Trim()}%"));
        var total = await query.CountAsync();
        var items = await query.OrderBy(e => e.Name).ThenBy(e => e.CampaignId).Skip(skip).Take(take).ToListAsync();
        return (items, total);
    }

    public async Task<Campaign> InsertAsync(Campaign entity)
    {
        _context.Campaigns.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<Campaign> UpdateAsync(Campaign entity)
    {
        var existing = await _context.Campaigns.FindAsync(entity.CampaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.Campaigns.FindAsync(id)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        _context.Campaigns.Remove(entity);
        await _context.SaveChangesAsync();
    }
}
