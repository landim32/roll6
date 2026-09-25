namespace Roll6.Infra.Interfaces.Repository;

public interface IMapModelRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    /// <summary>Map models of all users (or only of <paramref name="ownerUserId"/>), searching name/description.</summary>
    Task<(List<TModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long? ownerUserId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
}
