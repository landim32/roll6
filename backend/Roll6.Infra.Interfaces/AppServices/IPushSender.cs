namespace Roll6.Infra.Interfaces.AppServices;

/// <summary>Where a Web Push goes (043): the subscription's endpoint and the keys that encrypt the payload.</summary>
public sealed record PushTarget(string Endpoint, string P256dh, string Auth);

/// <summary>How the push service answered.</summary>
public enum PushSendResult
{
    Sent,
    /// <summary>404/410: the subscription no longer exists and must be removed.</summary>
    Gone,
    Failed
}

/// <summary>Sends one Web Push message (VAPID, aes128gcm). Never throws: failures come back as a result.</summary>
public interface IPushSender
{
    bool Enabled { get; }
    string? PublicKey { get; }
    Task<PushSendResult> SendAsync(PushTarget target, string payloadJson, string topic, bool urgent, TimeSpan timeToLive);
}
