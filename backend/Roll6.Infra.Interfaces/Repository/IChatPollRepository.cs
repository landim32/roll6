namespace Roll6.Infra.Interfaces.Repository;

/// <summary>Options and votes of chat polls (045).</summary>
public interface IChatPollRepository<TOption, TVote> where TOption : class where TVote : class
{
    Task InsertOptionsAsync(IEnumerable<TOption> options);
    Task<List<TOption>> ListOptionsByTurnsAsync(IEnumerable<long> turnIds);
    Task<List<TVote>> ListVotesByTurnsAsync(IEnumerable<long> turnIds);
    Task<TOption?> GetOptionAsync(long optionId);

    /// <summary>
    /// Replaces the voter's vote on the poll (characterId null = the master's): removes the one there is and saves
    /// <paramref name="vote"/> when given, in one transaction.
    /// </summary>
    Task SetVoteAsync(long turnId, long? characterId, TVote? vote);
}
