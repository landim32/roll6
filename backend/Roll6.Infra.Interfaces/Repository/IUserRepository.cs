namespace Roll6.Infra.Interfaces.Repository;

public interface IUserRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    Task<TModel?> GetByEmailAsync(string email);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
}
