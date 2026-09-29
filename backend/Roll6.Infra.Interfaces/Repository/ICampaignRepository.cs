namespace Roll6.Infra.Interfaces.Repository;

public interface ICampaignRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    /// <summary>Campaign with this slug, or null. Any logged-in user may read it.</summary>
    Task<TModel?> GetBySlugAsync(string slug);
    /// <summary>Slugs equal to <paramref name="baseSlug"/> or starting with <c>baseSlug-</c>, used to pick the next free suffix.</summary>
    Task<List<string>> ListSlugsWithPrefixAsync(string baseSlug);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    /// <summary>Campaigns of all users (or only of <paramref name="ownerUserId"/>), optionally filtered by name.</summary>
    Task<(List<TModel> Items, int TotalCount)> ListPagedAsync(string? search, int skip, int take, long? ownerUserId);
    /// <summary>
    /// Campaigns the user masters or plays (approved character), ordered by name, with the active current map.
    /// </summary>
    Task<List<CampaignTableRow>> ListTableAsync(long userId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
}
