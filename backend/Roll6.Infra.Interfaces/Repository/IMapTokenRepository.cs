namespace Roll6.Infra.Interfaces.Repository;

public interface IMapTokenRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByMapAsync(long mapId);
    /// <summary>The pieces of these maps (108: a split table plays on several at once).</summary>
    Task<List<TModel>> ListByMapIdsAsync(IEnumerable<long> mapIds);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    Task<bool> ExistsByTokenAsync(long tokenId);
    /// <summary>The campaigns whose maps (not deleted) hold a piece of the token, each once (063: a token change reaches them).</summary>
    Task<List<long>> ListCampaignIdsByTokenAsync(long tokenId);
    /// <summary>The campaigns whose maps (not deleted) hold a piece whose token carries the weapon in any socket (082/083).</summary>
    Task<List<long>> ListCampaignIdsByWeaponAsync(long weaponId);
    Task DeleteByMapIdsAsync(IEnumerable<long> mapIds);
    /// <summary>The piece of a campaign character, on whatever map it is (108: at most one).</summary>
    Task<TModel?> GetByCampaignCharacterAsync(long campaignCharacterId);
    /// <summary>Where these participations stand (maps not deleted); those off every map are left out.</summary>
    Task<List<CharacterMapRow>> ListMapsByParticipationsAsync(IEnumerable<long> campaignCharacterIds);
    /// <summary>Where the characters of these campaigns stand, in one query (108: the table combo).</summary>
    Task<List<CharacterMapRow>> ListMapsByCampaignsAsync(IReadOnlyCollection<long> campaignIds);
    /// <summary>The character pieces on the campaign's maps (not deleted).</summary>
    Task<List<TModel>> ListCharacterPiecesByCampaignAsync(long campaignId);
    /// <summary>The current owners of the characters on the map, each once: who follows it besides the master (108).</summary>
    Task<List<long>> ListCharacterOwnerIdsAsync(long mapId);
    Task<bool> AnyCharacterOnMapAsync(long mapId);
    /// <summary>Takes the characters off a map being deleted; its other pieces stay.</summary>
    Task DeleteCharactersByMapAsync(long mapId);
    Task DeleteByCampaignCharacterAsync(long campaignCharacterId);
    /// <summary>Pieces of every participation of the character.</summary>
    Task DeleteByCharacterAsync(long characterId);
    /// <summary>The piece of an NPC occurrence, if any.</summary>
    Task<TModel?> GetByMapNpcIdAsync(long mapNpcId);
    Task<List<TModel>> ListByMapNpcIdsAsync(IEnumerable<long> mapNpcIds);
    Task DeleteByMapNpcIdsAsync(IEnumerable<long> mapNpcIds);
}
