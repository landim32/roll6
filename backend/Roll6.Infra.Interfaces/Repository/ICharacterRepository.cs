namespace Roll6.Infra.Interfaces.Repository;

public interface ICharacterRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    Task<List<TModel>> ListByUserAsync(long userId);

    /// <summary>Characters of every user, filtered by name (ILIKE), ordered by name.</summary>
    Task<(List<TModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    /// <summary>True when some character uses the token as its own.</summary>
    Task<bool> ExistsByTokenAsync(long tokenId);
}
