namespace Roll6.Infra.Interfaces.Repository;

public interface IMapNpcRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    Task<List<TModel>> ListByMapAsync(long mapId);
    /// <summary>Occurrences of the NPC on any map of the campaign.</summary>
    Task<List<long>> ListIdsByCampaignAndNpcAsync(long campaignId, long npcId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    Task DeleteRangeAsync(IEnumerable<long> ids);
    Task DeleteByMapIdsAsync(IEnumerable<long> mapIds);
}
