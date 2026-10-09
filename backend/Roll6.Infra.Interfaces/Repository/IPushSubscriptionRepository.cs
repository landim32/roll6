namespace Roll6.Infra.Interfaces.Repository;

/// <summary>Web Push subscriptions (043): one row per device/browser endpoint.</summary>
public interface IPushSubscriptionRepository<TModel> where TModel : class
{
    Task<TModel?> GetByEndpointAsync(string endpoint);
    Task<List<TModel>> ListByUsersAsync(IReadOnlyCollection<long> userIds);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long pushSubscriptionId);
    /// <summary>Removes the endpoint only when it belongs to the user; false when there was nothing to remove.</summary>
    Task<bool> DeleteByEndpointAsync(long userId, string endpoint);
    Task TouchAsync(long pushSubscriptionId, DateTime at);
}
