namespace Roll6.Infra.Interfaces.Repository;

/// <summary>Per user and campaign notification choices (043).</summary>
public interface ICampaignNotificationPrefRepository<TModel> where TModel : class
{
    Task<TModel?> GetAsync(long userId, long campaignId);
    Task<List<TModel>> ListByUserAsync(long userId);
    Task<List<long>> ListMutedUserIdsAsync(long campaignId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteByCampaignAsync(long campaignId);
}
