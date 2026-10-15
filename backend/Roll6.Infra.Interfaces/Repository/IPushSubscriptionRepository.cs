namespace Roll6.Infra.Interfaces.Repository;

/// <summary>Web Push subscriptions (043): one row per device/browser endpoint.</summary>
public interface IPushSubscriptionRepository<TModel> where TModel : class
{
    Task<TModel?> GetByEndpointAsync(string endpoint);
    /// <summary>The devices that receive pushes: skipped ones (too many failures in a row, 074) are left out.</summary>
    Task<List<TModel>> ListByUsersAsync(IReadOnlyCollection<long> userIds);

    /// <summary>Every device of the user, skipped ones included (the device list, 074).</summary>
    Task<List<TModel>> ListByUserAsync(long userId);

    Task<List<TModel>> ListByIdsAsync(IReadOnlyCollection<long> pushSubscriptionIds);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    /// <summary>Deletes the device and its pending deliveries.</summary>
    Task DeleteAsync(long pushSubscriptionId);
    /// <summary>Removes the endpoint only when it belongs to the user; false when there was nothing to remove.</summary>
    Task<bool> DeleteByEndpointAsync(long userId, string endpoint);
    /// <summary>A push was accepted: last success = <paramref name="at"/>, failures back to 0.</summary>
    Task RecordSuccessAsync(long pushSubscriptionId, DateTime at);

    /// <summary>One more failure in a row; returns the new count (0 when the device no longer exists).</summary>
    Task<int> RecordFailureAsync(long pushSubscriptionId);
}
