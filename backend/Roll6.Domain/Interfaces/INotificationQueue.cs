using Roll6.Domain.Notifications;

namespace Roll6.Domain.Interfaces;

/// <summary>
/// Hands a notice (043) to the background delivery: returns at once, so no write waits for a push. Call it only after
/// the write that caused the notice succeeded, like <c>IRealtimeNotifier.PublishAsync</c>.
/// </summary>
public interface INotificationQueue
{
    void Enqueue(TableNotice notice);
}
