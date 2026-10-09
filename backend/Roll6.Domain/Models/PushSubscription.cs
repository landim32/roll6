using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Models;

/// <summary>
/// A device/browser of a user that receives Web Push notifications (043): the delivery endpoint the browser's push
/// service gave and the keys that encrypt the payload for it. One endpoint belongs to one subscription.
/// </summary>
public class PushSubscription
{
    public const int MAX_ENDPOINT = 1000;

    public long PushSubscriptionId { get; set; }
    public long UserId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }

    public static PushSubscription Create(long userId, string? endpoint, string? p256dh, string? auth, string? userAgent)
    {
        var subscription = new PushSubscription { UserId = userId, CreatedAt = DateTime.UtcNow };
        subscription.Fill(endpoint, p256dh, auth, userAgent);
        return subscription;
    }

    /// <summary>The same endpoint registered again (another user on a shared device, or renewed keys).</summary>
    public void MoveTo(long userId, string? p256dh, string? auth, string? userAgent)
    {
        UserId = userId;
        Fill(Endpoint, p256dh, auth, userAgent);
    }

    public void Touch(DateTime now) => LastUsedAt = now;

    private void Fill(string? endpoint, string? p256dh, string? auth, string? userAgent)
    {
        var url = endpoint?.Trim() ?? string.Empty;
        if (url.Length == 0 || url.Length > MAX_ENDPOINT || !Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            throw new DomainValidationException("endpoint", "Endereço de notificações inválido.");
        if (string.IsNullOrWhiteSpace(p256dh) || p256dh.Length > 200 || string.IsNullOrWhiteSpace(auth) || auth.Length > 100)
            throw new DomainValidationException("keys", "Chaves de notificação inválidas.");
        Endpoint = url;
        P256dh = p256dh.Trim();
        Auth = auth.Trim();
        var agent = userAgent?.Trim();
        UserAgent = string.IsNullOrEmpty(agent) ? null : agent[..Math.Min(agent.Length, 500)];
    }
}
