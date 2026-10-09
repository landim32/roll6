namespace Roll6.Infra.Interfaces.Repository;

/// <summary>Curtir / Amei on chat entries (044).</summary>
public interface IChatReactionRepository<TModel> where TModel : class
{
    Task<List<TModel>> ListByTurnsAsync(IEnumerable<long> turnIds);
    Task<TModel?> GetAsync(long turnId, long userId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long chatReactionId);
}
