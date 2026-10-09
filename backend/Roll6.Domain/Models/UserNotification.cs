namespace Roll6.Domain.Models;

/// <summary>
/// One notice as the user received it (inbox): the same title, text and link the Web Push (or the in-app toast) carried,
/// listed in the bell. Read when the user opens the bell or the notice.
/// </summary>
public class UserNotification
{
    public const int MAX_TITLE = 300;
    public const int MAX_BODY = 500;
    public const int MAX_URL = 500;

    public long UserNotificationId { get; set; }
    public long UserId { get; set; }
    public long? CampaignId { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? Url { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }

    public static UserNotification Create(long userId, long? campaignId, string kind, string title, string body, string? url) => new()
    {
        UserId = userId,
        CampaignId = campaignId,
        Kind = Cut(kind, 30),
        Title = Cut(title, MAX_TITLE),
        Body = Cut(body, MAX_BODY),
        Url = url == null ? null : Cut(url, MAX_URL),
        CreatedAt = DateTime.UtcNow
    };

    private static string Cut(string value, int max) => value.Length <= max ? value : value[..max];
}
