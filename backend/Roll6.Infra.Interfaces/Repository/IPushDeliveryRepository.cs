namespace Roll6.Infra.Interfaces.Repository;

/// <summary>The durable push outbox (074): one row per push still to deliver to one device.</summary>
public interface IPushDeliveryRepository<TModel> where TModel : class
{
    Task InsertRangeAsync(IReadOnlyCollection<TModel> deliveries);

    /// <summary>Rows whose next attempt is due, oldest first.</summary>
    Task<List<TModel>> ListDueAsync(DateTime now, int limit);

    Task UpdateAsync(TModel delivery);
    Task DeleteAsync(long pushDeliveryId);
    Task DeleteBySubscriptionAsync(long pushSubscriptionId);

    /// <summary>Drops the pushes that expired before being delivered; returns how many.</summary>
    Task<int> DeleteExpiredAsync(DateTime now);
}
