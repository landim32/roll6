namespace Roll6.Infra.Interfaces.Repository;

public interface IMapTokenRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByMapAsync(long mapId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    Task<bool> ExistsByTokenAsync(long tokenId);
    Task DeleteByMapIdsAsync(IEnumerable<long> mapIds);
}
