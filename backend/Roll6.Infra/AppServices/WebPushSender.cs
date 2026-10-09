using System.Net;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Roll6.DTO.Settings;
using Roll6.Infra.Interfaces.AppServices;

namespace Roll6.Infra.AppServices;

/// <summary>
/// Web Push through the browsers' own push services (043): VAPID authentication with the server's key pair and the
/// aes128gcm content encoding (the one Apple's service accepts). Without keys it is disabled and sends nothing.
/// </summary>
public class WebPushSender : IPushSender
{
    private readonly PushServiceClient? _client;
    private readonly ILogger<WebPushSender> _logger;

    /// <summary>A singleton: its own long-lived HttpClient, like the one the factory would hand out.</summary>
    public WebPushSender(IOptions<PushSettings> options, ILogger<WebPushSender> logger)
    {
        _logger = logger;
        var settings = options.Value;
        if (!settings.Enabled)
            return;
        PublicKey = settings.PublicKey;
        var subject = string.IsNullOrWhiteSpace(settings.Subject) ? "https://roll6.site" : settings.Subject;
        _client = new PushServiceClient(new HttpClient { Timeout = TimeSpan.FromSeconds(15) })
        {
            DefaultAuthentication = new VapidAuthentication(settings.PublicKey, settings.PrivateKey) { Subject = subject }
        };
    }

    public bool Enabled => _client != null;

    public string? PublicKey { get; }

    public async Task<PushSendResult> SendAsync(PushTarget target, string payloadJson, string topic, bool urgent, TimeSpan timeToLive)
    {
        if (_client == null)
            return PushSendResult.Failed;
        var subscription = new Lib.Net.Http.WebPush.PushSubscription { Endpoint = target.Endpoint };
        subscription.SetKey(PushEncryptionKeyName.P256DH, target.P256dh);
        subscription.SetKey(PushEncryptionKeyName.Auth, target.Auth);
        var message = new PushMessage(payloadJson)
        {
            Topic = topic,
            Urgency = urgent ? PushMessageUrgency.High : PushMessageUrgency.Normal,
            TimeToLive = (int)timeToLive.TotalSeconds
        };
        try
        {
            await _client.RequestPushMessageDeliveryAsync(subscription, message);
            return PushSendResult.Sent;
        }
        catch (PushServiceClientException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            return PushSendResult.Gone;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Web Push to {Host} failed", SafeHost(target.Endpoint));
            return PushSendResult.Failed;
        }
    }

    private static string SafeHost(string endpoint) => Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) ? uri.Host : "?";
}
