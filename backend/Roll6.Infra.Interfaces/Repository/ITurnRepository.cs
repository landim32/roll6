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
    /// <summary>Saves every column of an entry changed by the master (030).</summary>
    Task<TModel> UpdateAsync(TModel entity);
    /// <summary>Distinct turn numbers above <paramref name="turnNo"/> that have entries, ascending (030).</summary>
    Task<List<int>> ListTurnNosAfterAsync(long campaignId, int turnNo);
    /// <summary>Deletes the entries of the turns above <paramref name="turnNo"/>; returns how many (030).</summary>
    Task<int> DeleteAfterTurnAsync(long campaignId, int turnNo);
    Task DeleteAsync(long id);
    Task DeleteRangeAsync(IEnumerable<long> ids);
    Task DeleteByCampaignAsync(long campaignId);
    Task DeleteByCharacterAsync(long characterId);
    Task DeleteByNpcAsync(long npcId);

    // --- Chat (041): the same timeline read as the campaign chat ---

    /// <summary>
    /// A page ordered by (created_at, id), every type, deleted ones included, returned ascending: the newest without
    /// cursor, older with <paramref name="before"/>, newer with <paramref name="after"/>.
    /// </summary>
    Task<List<TModel>> ListChatPageAsync(long campaignId, (DateTime At, long Id)? before, (DateTime At, long Id)? after, int limit);

    /// <summary>The turn records (types 1–5, not deleted) of the given turns, in order.</summary>
    Task<List<TModel>> ListLogByTurnsAsync(long campaignId, IEnumerable<int> turnNos);

    /// <summary>Entries by others, not deleted, after <paramref name="since"/> (all when null), at most <paramref name="cap"/>.</summary>
    Task<int> CountUnreadAsync(long campaignId, long userId, DateTime? since, int cap);

    Task<TModel?> FirstUnreadAsync(long campaignId, long userId, DateTime? since);

    /// <summary>When the user last poked in the campaign (043), for the one-minute interval.</summary>
    Task<DateTime?> LastPokeAtAsync(long campaignId, long userId);

    /// <summary>Entries by id, whatever their type (044: reply targets of a chat page).</summary>
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);

    /// <summary>The actor's valid (neither deleted nor cancelled) actions of a turn (044).</summary>
    Task<List<TModel>> ListValidActionsAsync(long campaignId, int turnNo, long? characterId, long? mapNpcId);

    /// <summary>Stored photo and audio names of the campaign's chat (deleted with the campaign).</summary>
    Task<List<string>> ListChatMediaAsync(long campaignId);

    /// <summary>Removes the end-of-turn dividers from <paramref name="turnNo"/> on (moving the current turn back).</summary>
    Task<int> DeleteFinishedFromAsync(long campaignId, int turnNo);
    Task DeleteByMapNpcIdsAsync(IEnumerable<long> mapNpcIds);
}
