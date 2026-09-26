using Microsoft.EntityFrameworkCore;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class CampaignCharacterRepository : ICampaignCharacterRepository<CampaignCharacter>
{
    private readonly Roll6Context _context;

    public CampaignCharacterRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<CampaignCharacter?> GetByIdAsync(long id)
    {
        return await _context.CampaignCharacters.AsNoTracking().FirstOrDefaultAsync(e => e.CampaignCharacterId == id);
    }

    public async Task<CampaignCharacter?> GetAsync(long campaignId, long characterId)
    {
        return await _context.CampaignCharacters.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CampaignId == campaignId && e.CharacterId == characterId);
    }

    public async Task<List<CampaignCharacter>> ListByIdsAsync(IEnumerable<long> ids)
    {
        var idList = ids.ToList();
        return await _context.CampaignCharacters.AsNoTracking().Where(e => idList.Contains(e.CampaignCharacterId)).ToListAsync();
    }

    public async Task<List<CampaignCharacter>> ListByCampaignAsync(long campaignId, bool approvedOnly)
    {
        var query = _context.CampaignCharacters.AsNoTracking().Where(e => e.CampaignId == campaignId);
        if (approvedOnly)
            query = query.Where(e => e.Status == CampaignCharacterStatus.Approved);
        return await query.OrderBy(e => e.Status).ThenBy(e => e.CampaignCharacterId).ToListAsync();
    }

    public async Task<List<CampaignCharacter>> ListInvitesByUserAsync(long userId)
    {
        return await _context.CampaignCharacters.AsNoTracking()
            .Where(e => e.Status == CampaignCharacterStatus.Invited
                        && _context.Characters.Any(c => c.CharacterId == e.CharacterId && c.UserId == userId))
            .OrderBy(e => e.CampaignCharacterId)
            .ToListAsync();
    }

    public async Task<bool> HasApprovedCharacterAsync(long campaignId, long userId)
    {
        return await _context.CampaignCharacters
            .AnyAsync(e => e.CampaignId == campaignId
                           && e.Status == CampaignCharacterStatus.Approved
                           && _context.Characters.Any(c => c.CharacterId == e.CharacterId && c.UserId == userId));
    }

    public async Task<List<CampaignCharacter>> ListByCampaignAndUserAsync(long campaignId, long userId)
    {
        return await _context.CampaignCharacters.AsNoTracking()
            .Where(e => e.CampaignId == campaignId
                        && _context.Characters.Any(c => c.CharacterId == e.CharacterId && c.UserId == userId))
            .OrderBy(e => e.CreatedAt).ThenBy(e => e.CampaignCharacterId)
            .ToListAsync();
    }

    public async Task<CampaignCharacter> InsertAsync(CampaignCharacter entity)
    {
        _context.CampaignCharacters.Add(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<CampaignCharacter> UpdateAsync(CampaignCharacter entity)
    {
        var existing = await _context.CampaignCharacters.FindAsync(entity.CampaignCharacterId)
            ?? throw new KeyNotFoundException("Participação não encontrada.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteByCampaignAsync(long campaignId)
    {
        await _context.CampaignCharacters.Where(e => e.CampaignId == campaignId).ExecuteDeleteAsync();
    }

    public async Task DeleteByCharacterAsync(long characterId)
    {
        await _context.CampaignCharacters.Where(e => e.CharacterId == characterId).ExecuteDeleteAsync();
    }

    public async Task DeleteAsync(long id)
    {
        await _context.CampaignCharacters.Where(e => e.CampaignCharacterId == id).ExecuteDeleteAsync();
    }

    public async Task ClampVitalsAsync(long characterId, int totalLife, int totalEnergy)
    {
        await _context.CampaignCharacters
            .Where(e => e.CharacterId == characterId && (e.CurrentLife > totalLife || e.CurrentEnergy > totalEnergy))
            .ExecuteUpdateAsync(s => s
                .SetProperty(e => e.CurrentLife, e => e.CurrentLife > totalLife ? totalLife : e.CurrentLife)
                .SetProperty(e => e.CurrentEnergy, e => e.CurrentEnergy > totalEnergy ? totalEnergy : e.CurrentEnergy));
    }
}
