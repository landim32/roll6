namespace Roll6.Domain.Models;

/// <summary>
/// Where a user stopped reading a campaign's chat (041): everything newer is unread, on every device of the user.
/// </summary>
public class ChatRead
{
    public long ChatReadId { get; set; }
    public long CampaignId { get; set; }
    public long UserId { get; set; }
    public DateTime LastReadAt { get; set; }

    public static ChatRead Create(long campaignId, long userId, DateTime at) =>
        new() { CampaignId = campaignId, UserId = userId, LastReadAt = at };

    /// <summary>The mark only moves forward; false when <paramref name="at"/> is not newer.</summary>
    public bool MoveTo(DateTime at)
    {
        if (at <= LastReadAt)
            return false;
        LastReadAt = at;
        return true;
    }
}
