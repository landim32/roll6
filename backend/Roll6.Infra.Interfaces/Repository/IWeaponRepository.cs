namespace Roll6.Infra.Interfaces.Repository;

public interface IWeaponRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    /// <summary>
    /// The weapon library (082): every weapon, or only those of <paramref name="ownerUserId"/>, searching the name; the
    /// viewer's own first, then by name.
    /// </summary>
    Task<(List<TModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long? ownerUserId, long viewerUserId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
}
