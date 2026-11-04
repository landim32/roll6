using Microsoft.EntityFrameworkCore;
using Npgsql;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Infra.Repository;

public class MapTokenRepository : IMapTokenRepository<MapToken>
{
    private readonly Roll6Context _context;

    public MapTokenRepository(Roll6Context context)
    {
        _context = context;
    }

    public async Task<MapToken?> GetByIdAsync(long id)
    {
        return await _context.MapTokens.AsNoTracking().FirstOrDefaultAsync(e => e.MapTokenId == id);
    }

    public async Task<List<MapToken>> ListByMapAsync(long mapId)
    {
        return await _context.MapTokens.AsNoTracking()
            .Where(e => e.MapId == mapId)
            .OrderBy(e => e.Name).ThenBy(e => e.MapTokenId)
            .ToListAsync();
    }

    public async Task<List<MapToken>> ListByMapIdsAsync(IEnumerable<long> mapIds)
    {
        var idList = mapIds.Distinct().ToList();
        return await _context.MapTokens.AsNoTracking()
            .Where(e => idList.Contains(e.MapId))
            .OrderBy(e => e.Name).ThenBy(e => e.MapTokenId)
            .ToListAsync();
    }

    public async Task<MapToken> InsertAsync(MapToken entity)
    {
        _context.MapTokens.Add(entity);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException
                                           {
                                               SqlState: PostgresErrorCodes.UniqueViolation,
                                               ConstraintName: "ix_map_tokens_campaign_character"
                                           })
        {
            // 108: another request placed the character first; the index keeps it on one map.
            _context.Entry(entity).State = EntityState.Detached;
            throw new ConflictException("O personagem já está em um mapa.");
        }
        return entity;
    }

    public async Task<MapToken> UpdateAsync(MapToken entity)
    {
        var existing = await _context.MapTokens.FindAsync(entity.MapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        _context.Entry(existing).CurrentValues.SetValues(entity);
        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task DeleteAsync(long id)
    {
        var entity = await _context.MapTokens.FindAsync(id)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        _context.MapTokens.Remove(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> ExistsByTokenAsync(long tokenId)
    {
        return await _context.MapTokens.AnyAsync(e => e.TokenId == tokenId);
    }

    public async Task<List<long>> ListCampaignIdsByTokenAsync(long tokenId)
    {
        return await (
                from piece in _context.MapTokens.AsNoTracking()
                join map in _context.Maps.AsNoTracking() on piece.MapId equals map.MapId
                where piece.TokenId == tokenId && map.Status != MapStatus.Deleted
                select map.CampaignId)
            .Distinct()
            .ToListAsync();
    }

    public async Task<List<long>> ListCampaignIdsByWeaponAsync(long weaponId)
    {
        return await (
                from piece in _context.MapTokens.AsNoTracking()
                join held in _context.TokenWeapons.AsNoTracking() on piece.TokenId equals held.TokenId
                join map in _context.Maps.AsNoTracking() on piece.MapId equals map.MapId
                where held.WeaponId == weaponId && map.Status != MapStatus.Deleted
                select map.CampaignId)
            .Distinct()
            .ToListAsync();
    }

    public async Task DeleteByMapIdsAsync(IEnumerable<long> mapIds)
    {
        var idList = mapIds.ToList();
        await _context.MapTokens.Where(e => idList.Contains(e.MapId)).ExecuteDeleteAsync();
    }

    public async Task<MapToken?> GetByCampaignCharacterAsync(long campaignCharacterId)
    {
        return await _context.MapTokens.AsNoTracking()
            .FirstOrDefaultAsync(e => e.CampaignCharacterId == campaignCharacterId);
    }

    public async Task<List<CharacterMapRow>> ListMapsByParticipationsAsync(IEnumerable<long> campaignCharacterIds)
    {
        var idList = campaignCharacterIds.Distinct().ToList();
        if (idList.Count == 0)
            return new List<CharacterMapRow>();
        return await CharacterMaps().Where(row => idList.Contains(row.CampaignCharacterId)).ToListAsync();
    }

    public async Task<List<CharacterMapRow>> ListMapsByCampaignsAsync(IReadOnlyCollection<long> campaignIds)
    {
        if (campaignIds.Count == 0)
            return new List<CharacterMapRow>();
        return await CharacterMaps().Where(row => campaignIds.Contains(row.CampaignId)).ToListAsync();
    }

    /// <summary>Every character piece on a map that is not deleted, with its map and its character's owner.</summary>
    private IQueryable<CharacterMapRow> CharacterMaps() =>
        from piece in _context.MapTokens.AsNoTracking()
        join map in _context.Maps.AsNoTracking() on piece.MapId equals map.MapId
        join participation in _context.CampaignCharacters.AsNoTracking()
            on piece.CampaignCharacterId equals (long?)participation.CampaignCharacterId
        join character in _context.Characters.AsNoTracking() on participation.CharacterId equals character.CharacterId
        where map.Status != MapStatus.Deleted
        select new CharacterMapRow
        {
            CampaignCharacterId = participation.CampaignCharacterId,
            CampaignId = map.CampaignId,
            CharacterId = character.CharacterId,
            OwnerUserId = character.UserId,
            MapId = map.MapId,
            MapName = map.Name
        };

    public async Task<List<MapToken>> ListCharacterPiecesByCampaignAsync(long campaignId)
    {
        return await (
                from piece in _context.MapTokens.AsNoTracking()
                join map in _context.Maps.AsNoTracking() on piece.MapId equals map.MapId
                where piece.CampaignCharacterId != null && map.CampaignId == campaignId && map.Status != MapStatus.Deleted
                select piece)
            .ToListAsync();
    }

    public async Task<List<long>> ListCharacterOwnerIdsAsync(long mapId)
    {
        return await (
                from piece in _context.MapTokens.AsNoTracking()
                join participation in _context.CampaignCharacters.AsNoTracking()
                    on piece.CampaignCharacterId equals (long?)participation.CampaignCharacterId
                join character in _context.Characters.AsNoTracking() on participation.CharacterId equals character.CharacterId
                where piece.MapId == mapId
                select character.UserId)
            .Distinct()
            .ToListAsync();
    }

    public async Task<bool> AnyCharacterOnMapAsync(long mapId)
    {
        return await _context.MapTokens.AnyAsync(e => e.MapId == mapId && e.CampaignCharacterId != null);
    }

    public async Task DeleteCharactersByMapAsync(long mapId)
    {
        await _context.MapTokens.Where(e => e.MapId == mapId && e.CampaignCharacterId != null).ExecuteDeleteAsync();
    }

    public async Task DeleteByCampaignCharacterAsync(long campaignCharacterId)
    {
        await _context.MapTokens.Where(e => e.CampaignCharacterId == campaignCharacterId).ExecuteDeleteAsync();
    }

    public async Task<MapToken?> GetByMapNpcIdAsync(long mapNpcId)
    {
        return await _context.MapTokens.AsNoTracking().FirstOrDefaultAsync(e => e.MapNpcId == mapNpcId);
    }

    public async Task<List<MapToken>> ListByMapNpcIdsAsync(IEnumerable<long> mapNpcIds)
    {
        var idList = mapNpcIds.Select(id => (long?)id).ToList();
        return await _context.MapTokens.AsNoTracking().Where(e => idList.Contains(e.MapNpcId)).ToListAsync();
    }

    public async Task DeleteByMapNpcIdsAsync(IEnumerable<long> mapNpcIds)
    {
        var idList = mapNpcIds.Select(id => (long?)id).ToList();
        await _context.MapTokens.Where(e => idList.Contains(e.MapNpcId)).ExecuteDeleteAsync();
    }

    public async Task DeleteByCharacterAsync(long characterId)
    {
        await _context.MapTokens
            .Where(e => _context.CampaignCharacters.Any(c => c.CampaignCharacterId == e.CampaignCharacterId && c.CharacterId == characterId))
            .ExecuteDeleteAsync();
    }
}
