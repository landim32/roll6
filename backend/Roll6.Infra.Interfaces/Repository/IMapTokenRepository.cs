namespace Roll6.Infra.Interfaces.Repository;

public interface IMapTokenRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByMapAsync(long mapId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    Task<bool> ExistsByTokenAsync(long tokenId);
    /// <summary>The campaigns whose maps (not deleted) hold a piece of the token, each once (063: a token change reaches them).</summary>
    Task<List<long>> ListCampaignIdsByTokenAsync(long tokenId);
    /// <summary>The campaigns whose maps (not deleted) hold a piece whose token holds the weapon in either hand (082).</summary>
    Task<List<long>> ListCampaignIdsByWeaponAsync(long weaponId);
    Task DeleteByMapIdsAsync(IEnumerable<long> mapIds);
    /// <summary>The piece of a campaign character on a map, if it is there.</summary>
    Task<TModel?> GetByMapAndCampaignCharacterAsync(long mapId, long campaignCharacterId);
    Task DeleteByCampaignCharacterAsync(long campaignCharacterId);
    /// <summary>Pieces of every participation of the character.</summary>
    Task DeleteByCharacterAsync(long characterId);
    /// <summary>The piece of an NPC occurrence, if any.</summary>
    Task<TModel?> GetByMapNpcIdAsync(long mapNpcId);
    Task<List<TModel>> ListByMapNpcIdsAsync(IEnumerable<long> mapNpcIds);
    Task DeleteByMapNpcIdsAsync(IEnumerable<long> mapNpcIds);
}
