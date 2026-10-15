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

    public async Task<List<long>> ListCampaignIdsByNpcAsync(long npcId)
    {
        return await _context.CampaignNpcs.Where(e => e.NpcId == npcId).Select(e => e.CampaignId).Distinct().ToListAsync();
    }

    public async Task<bool> ExistsByNpcAsync(long npcId)
    {
        return await _context.CampaignNpcs.AnyAsync(e => e.NpcId == npcId);
    }

    public async Task<List<CampaignNpc>> ListByCampaignAndNpcsAsync(long campaignId, IEnumerable<long> npcIds)
    {
        var ids = npcIds.Distinct().ToList();
        if (ids.Count == 0)
            return new List<CampaignNpc>();
        return await _context.CampaignNpcs.AsNoTracking()
            .Where(e => e.CampaignId == campaignId && ids.Contains(e.NpcId))
            .ToListAsync();
    }

    public async Task<CampaignNpc> UpdateAsync(CampaignNpc entity)
    {
        var existing = await _context.CampaignNpcs.FindAsync(entity.CampaignNpcId)
            ?? throw new KeyNotFoundException("NPC da campanha não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<List<long>> ClearMasterAsync(IEnumerable<long> campaignCharacterIds)
    {
        var ids = campaignCharacterIds.Distinct().ToList();
        if (ids.Count == 0)
            return new List<long>();
        var query = _context.CampaignNpcs.Where(e => e.MasterCampaignCharacterId != null && ids.Contains(e.MasterCampaignCharacterId.Value));
        var campaigns = await query.Select(e => e.CampaignId).Distinct().ToListAsync();
        if (campaigns.Count > 0)
            await query.ExecuteUpdateAsync(s => s.SetProperty(e => e.MasterCampaignCharacterId, (long?)null));
        return campaigns;
    }

    public async Task<List<long>> ClearMasterByCharacterAsync(long characterId)
    {
        var participations = await _context.CampaignCharacters.Where(p => p.CharacterId == characterId)
            .Select(p => p.CampaignCharacterId).ToListAsync();
        return await ClearMasterAsync(participations);
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
