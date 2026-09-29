namespace Roll6.Infra.Interfaces.Repository;

public interface IMapRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    /// <summary>Map with this slug, including Deleted. The service decides whether it can be read.</summary>
    Task<TModel?> GetBySlugAsync(string slug);
    /// <summary>Slugs equal to <paramref name="baseSlug"/> or starting with <c>baseSlug-</c>, used to pick the next free suffix.</summary>
    Task<List<string>> ListSlugsWithPrefixAsync(string baseSlug);
    Task<(List<TModel> Items, int TotalCount)> ListByCampaignPagedAsync(long campaignId, int skip, int take);

    /// <summary>Sets the next Sequence for (campaign, map model) and Name = "{mapModelName} {sequence}", then inserts.</summary>
    Task<TModel> InsertWithNextSequenceAsync(TModel entity, string mapModelName);

    Task<TModel> UpdateAsync(TModel entity);
    Task<int> CountNotDeletedByCampaignAsync(long campaignId);
    Task<List<long>> ListDeletedIdsByCampaignAsync(long campaignId);
    Task DeleteRangeAsync(IEnumerable<long> ids);
    Task<bool> ExistsByMapModelAsync(long mapModelId);
    /// <summary>Campaigns with a non-deleted map made from the model.</summary>
    Task<List<long>> ListCampaignIdsByModelAsync(long mapModelId);
}
