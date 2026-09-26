namespace Roll6.Infra.Interfaces.Repository;

public interface ITurnRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    /// <summary>Entries of a campaign turn, oldest first.</summary>
    Task<List<TModel>> ListByCampaignTurnAsync(long campaignId, int turnNo);
    /// <summary>Entries of one character (or NPC occurrence) in a campaign turn.</summary>
    Task<List<TModel>> ListByActorTurnAsync(long campaignId, int turnNo, long? characterId, long? mapNpcId);
    /// <summary>True when the character (or NPC occurrence) already moved in the turn.</summary>
    Task<bool> ExistsMovementAsync(long campaignId, int turnNo, long? characterId, long? mapNpcId);
    Task<TModel> InsertAsync(TModel entity);
    Task DeleteAsync(long id);
    Task DeleteRangeAsync(IEnumerable<long> ids);
    Task DeleteByCampaignAsync(long campaignId);
    Task DeleteByCharacterAsync(long characterId);
    Task DeleteByNpcAsync(long npcId);
    Task DeleteByMapNpcIdsAsync(IEnumerable<long> mapNpcIds);
}
