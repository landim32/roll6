namespace Roll6.Infra.Interfaces.Repository;

/// <summary>The notices each user received (the bell's inbox).</summary>
public interface IUserNotificationRepository<TModel> where TModel : class
{
    Task InsertRangeAsync(IEnumerable<TModel> entities);
    Task<List<TModel>> ListByUserAsync(long userId, int limit);
    Task<int> CountUnreadAsync(long userId);
    /// <summary>Marks one (id) or all (null) of the user's notices as read.</summary>
    Task MarkReadAsync(long userId, long? id, DateTime at);
    Task DeleteByCampaignAsync(long campaignId);
}
