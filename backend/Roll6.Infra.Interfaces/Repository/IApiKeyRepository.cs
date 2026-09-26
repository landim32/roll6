namespace Roll6.Infra.Interfaces.Repository;

public interface IApiKeyRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    /// <summary>The key whose SHA-256 hash matches, or null.</summary>
    Task<TModel?> GetByHashAsync(string keyHash);
    /// <summary>Keys of the user, newest first.</summary>
    Task<List<TModel>> ListByUserAsync(long userId);
    /// <summary>Keys neither revoked nor expired at <paramref name="now"/>.</summary>
    Task<int> CountActiveByUserAsync(long userId, DateTime now);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    /// <summary>Records a use without loading the entity.</summary>
    Task TouchLastUsedAsync(long id, DateTime now);
}
