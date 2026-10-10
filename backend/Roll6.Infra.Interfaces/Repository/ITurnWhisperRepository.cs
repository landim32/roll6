namespace Roll6.Infra.Interfaces.Repository;

/// <summary>Recipients of whispers (047).</summary>
public interface ITurnWhisperRepository<TModel> where TModel : class
{
    Task InsertAsync(IEnumerable<TModel> targets);
    Task<List<TModel>> ListByTurnsAsync(IEnumerable<long> turnIds);
}
