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
    /// <summary>The last Movement of each character / NPC occurrence up to a turn (positions of a finished turn, 024).</summary>
    Task<List<TModel>> ListLastMovementsAsync(long campaignId, int turnNo);
    /// <summary>
    /// Narration entries of <paramref name="turnNo"/>, or — when it is null — of the greatest turn below
    /// <paramref name="beforeTurn"/> that has one. Oldest first (029).
    /// </summary>
    Task<List<TModel>> ListNarrationsAsync(long campaignId, int? turnNo, int beforeTurn);
    /// <summary>Entries of a range of turns, ordered by turn and time (turn history, 028).</summary>
    Task<List<TModel>> ListByCampaignTurnRangeAsync(long campaignId, int fromTurn, int toTurn);
    Task<TModel> InsertAsync(TModel entity);
    Task DeleteAsync(long id);
    Task DeleteRangeAsync(IEnumerable<long> ids);
    Task DeleteByCampaignAsync(long campaignId);
    Task DeleteByCharacterAsync(long characterId);
    Task DeleteByNpcAsync(long npcId);
    Task DeleteByMapNpcIdsAsync(IEnumerable<long> mapNpcIds);
}
