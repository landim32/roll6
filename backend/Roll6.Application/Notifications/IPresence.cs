using Roll6.DTO.Push;

namespace Roll6.Application.Notifications;

/// <summary>Who has what on screen right now (043), from the table hub connections.</summary>
public interface IPresence
{
    /// <summary>A visible window of the user follows the campaign with the chat visible.</summary>
    bool IsChatVisible(long userId, long campaignId);

    /// <summary>A visible window of the user follows the campaign (any layout).</summary>
    bool IsCampaignVisible(long userId, long campaignId);
}

/// <summary>Shows a personal notice as a toast in the user's windows of that campaign (043).</summary>
public interface INoticeChannel
{
    Task SendNoticeAsync(long userId, long campaignId, NoticeInfo notice);

    /// <summary>Tells every window of the user that the bell has something new (any campaign).</summary>
    Task InboxChangedAsync(long userId);
}
