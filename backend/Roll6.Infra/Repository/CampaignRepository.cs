using Microsoft.EntityFrameworkCore;
using Npgsql;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Slugs;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class CampaignRepository : ICampaignRepository<Campaign>
{
    private const int MAX_INSERT_ATTEMPTS = 2;

    private readonly Roll6Context _context;

    public CampaignRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<Campaign?> GetByIdAsync(long id)
    {
        return await _context.Campaigns.AsNoTracking().FirstOrDefaultAsync(e => e.CampaignId == id);
    }

    public async Task<Campaign?> GetBySlugAsync(string slug)
    {
        return await _context.Campaigns.AsNoTracking().FirstOrDefaultAsync(e => e.Slug == slug);
    }

    public async Task<List<string>> ListSlugsWithPrefixAsync(string baseSlug)
    {
        var prefixed = baseSlug + "-";
        return await _context.Campaigns.AsNoTracking()
            .Where(e => e.Slug == baseSlug || e.Slug.StartsWith(prefixed))
            .Select(e => e.Slug)
            .ToListAsync();
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

    public async Task<List<CampaignTableRow>> ListTableAsync(long userId)
    {
        return await (
            from campaign in _context.Campaigns.AsNoTracking()
            where campaign.UserId == userId
                  || _context.CampaignCharacters.Any(participation =>
                      participation.CampaignId == campaign.CampaignId
                      && participation.Status == CampaignCharacterStatus.Approved
                      && _context.Characters.Any(character =>
                          character.CharacterId == participation.CharacterId && character.UserId == userId))
            join map in _context.Maps.AsNoTracking().Where(map => map.Status == MapStatus.Active)
                on campaign.CurrentMapId equals map.MapId into maps
            from map in maps.DefaultIfEmpty()
            orderby campaign.Name.ToLower(), campaign.CampaignId
            select new CampaignTableRow
            {
                CampaignId = campaign.CampaignId,
                UserId = campaign.UserId,
                Name = campaign.Name,
                Slug = campaign.Slug,
                CurrentMapId = map != null ? map.MapId : null,
                CurrentMapName = map != null ? map.Name : null,
                CurrentMapSlug = map != null ? map.Slug : null
            }).ToListAsync();
    }

    public async Task<Campaign> InsertAsync(Campaign entity)
    {
        for (var attempt = 1; ; attempt++)
        {
            var baseSlug = Slug.From(entity.Name, "campanha");
            var taken = await ListSlugsWithPrefixAsync(baseSlug);
            entity.AssignSlug(Slug.NextFree(baseSlug, taken));

            _context.Campaigns.Add(entity);
            try
            {
                await _context.SaveChangesAsync();
                return entity;
            }
            catch (DbUpdateException ex) when (attempt < MAX_INSERT_ATTEMPTS
                                               && ex.InnerException is PostgresException
                                               {
                                                   SqlState: PostgresErrorCodes.UniqueViolation,
                                                   ConstraintName: "ix_campaigns_slug"
                                               })
            {
                _context.Entry(entity).State = EntityState.Detached;
            }
        }
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
