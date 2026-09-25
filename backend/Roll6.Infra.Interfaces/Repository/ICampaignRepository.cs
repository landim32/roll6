namespace Roll6.Infra.Interfaces.Repository;

public interface ICampaignRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    /// <summary>Campaigns of all users (or only of <paramref name="ownerUserId"/>), optionally filtered by name.</summary>
    Task<(List<TModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long? ownerUserId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
}
