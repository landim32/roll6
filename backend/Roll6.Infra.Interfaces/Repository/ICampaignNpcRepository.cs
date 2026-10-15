namespace Roll6.Infra.Interfaces.Repository;

public interface ICampaignNpcRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<TModel?> GetAsync(long campaignId, long npcId);
    Task<List<TModel>> ListByCampaignAsync(long campaignId);
    /// <summary>True when the NPC is in some campaign.</summary>
    Task<bool> ExistsByNpcAsync(long npcId);
    /// <summary>Campaigns where the NPC is available.</summary>
    Task<List<long>> ListCampaignIdsByNpcAsync(long npcId);
    /// <summary>The campaign NPCs of these NPCs in the campaign (071: category and master of map pieces).</summary>
    Task<List<TModel>> ListByCampaignAndNpcsAsync(long campaignId, IEnumerable<long> npcIds);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    /// <summary>
    /// Clears the master of every ally commanded by these participations (071), before they stop being approved or are
    /// deleted. Returns the campaigns that had one.
    /// </summary>
    Task<List<long>> ClearMasterAsync(IEnumerable<long> campaignCharacterIds);
    /// <summary>Same, for every participation of a character about to be deleted (071).</summary>
    Task<List<long>> ClearMasterByCharacterAsync(long characterId);
    Task DeleteAsync(long id);
    Task DeleteByCampaignAsync(long campaignId);
}
