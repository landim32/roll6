namespace SimpleTabletopMap.Infra.Interfaces.Repository;

public interface IMapRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<(List<TModel> Items, int TotalCount)> ListByCampaignPagedAsync(long campaignId, int skip, int take);

    /// <summary>Sets the next Sequence for (campaign, map model) and Name = "{mapModelName} {sequence}", then inserts.</summary>
    Task<TModel> InsertWithNextSequenceAsync(TModel entity, string mapModelName);

    Task<TModel> UpdateAsync(TModel entity);
    Task<int> CountNotDeletedByCampaignAsync(long campaignId);
    Task<List<long>> ListDeletedIdsByCampaignAsync(long campaignId);
    Task DeleteRangeAsync(IEnumerable<long> ids);
    Task<bool> ExistsByMapModelAsync(long mapModelId);
}
