namespace Roll6.Infra.Interfaces.Repository;

public interface ICampaignPlanRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    /// <summary>Entries of the campaign in creation order.</summary>
    Task<List<TModel>> ListByCampaignAsync(long campaignId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    Task DeleteByCampaignAsync(long campaignId);
}
