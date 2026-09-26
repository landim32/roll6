namespace Roll6.Infra.Interfaces.Repository;

public interface INpcRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    /// <summary>NPCs of <paramref name="ownerUserId"/>, searching the name.</summary>
    Task<(List<TModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long ownerUserId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    /// <summary>True when some NPC uses the library token.</summary>
    Task<bool> ExistsByTokenAsync(long tokenId);
}
