namespace Roll6.Application.Notifications;

/// <summary>
/// The table hub as seen by the notifications (043). Since 074 notices are only Web Pushes — there is no in-app toast —
/// so all that is left is telling the user's windows that the bell has something new.
/// </summary>
public interface INoticeChannel
{
    /// <summary>Tells every window of the user that the bell has something new (any campaign).</summary>
    Task InboxChangedAsync(long userId);
}
