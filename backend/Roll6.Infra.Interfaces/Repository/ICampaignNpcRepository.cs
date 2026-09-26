namespace Roll6.Infra.Interfaces.Repository;

public interface ICampaignNpcRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<TModel?> GetAsync(long campaignId, long npcId);
    Task<List<TModel>> ListByCampaignAsync(long campaignId);
    /// <summary>True when the NPC is in some campaign.</summary>
    Task<bool> ExistsByNpcAsync(long npcId);
    Task<TModel> InsertAsync(TModel entity);
    Task DeleteAsync(long id);
    Task DeleteByCampaignAsync(long campaignId);
}
