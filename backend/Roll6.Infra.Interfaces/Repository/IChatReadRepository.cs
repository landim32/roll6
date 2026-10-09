namespace Roll6.Infra.Interfaces.Repository;

/// <summary>Where each user stopped reading each campaign's chat (041).</summary>
public interface IChatReadRepository<TModel> where TModel : class
{
    Task<TModel?> GetAsync(long campaignId, long userId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteByCampaignAsync(long campaignId);
}
