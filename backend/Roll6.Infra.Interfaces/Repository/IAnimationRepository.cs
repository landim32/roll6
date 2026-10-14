namespace Roll6.Infra.Interfaces.Repository;

public interface IAnimationRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    /// <summary>
    /// The library (059): every animation, or only those of <paramref name="ownerUserId"/>, of one type when given,
    /// searching the name; the viewer's own first, then by name.
    /// </summary>
    Task<(List<TModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long? ownerUserId, int? type, long viewerUserId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
}
