using System.Text.Json.Serialization;
using Roll6.DTO.Chat;

namespace Roll6.DTO.Push;

/// <summary>
/// A personal notice shown as a toast inside the app (043) when its campaign is on screen: "Falta apenas você",
/// "Turno N terminado", PV, Fadiga, a poke. Sent through the table hub method <c>notice</c>.
/// </summary>
public class NoticeInfo
{
    /// <summary>majority | turnFinished | life | fatigue | poke</summary>
    [JsonPropertyName("kind")]
    public string Kind { get; set; } = string.Empty;

    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;
}

/// <summary>The VAPID public key the browser subscribes with; null when notifications are not configured.</summary>
public class PushKeyInfo
{
    [JsonPropertyName("publicKey")]
    public string? PublicKey { get; set; }
}

/// <summary>A browser's push subscription (043), as <c>PushSubscription.toJSON()</c> gives it.</summary>
public class PushSubscriptionInfo
{
    [JsonPropertyName("endpoint")]
    public string? Endpoint { get; set; }

    [JsonPropertyName("keys")]
    public PushSubscriptionKeysInfo? Keys { get; set; }

    [JsonPropertyName("userAgent")]
    public string? UserAgent { get; set; }
}

public class PushSubscriptionKeysInfo
{
    [JsonPropertyName("p256dh")]
    public string? P256dh { get; set; }

    [JsonPropertyName("auth")]
    public string? Auth { get; set; }
}

/// <summary>Removes this device's subscription.</summary>
public class PushUnsubscribeInfo
{
    [JsonPropertyName("endpoint")]
    public string? Endpoint { get; set; }
}

/// <summary>A campaign of the user's table and whether its notifications are muted (043).</summary>
public class CampaignNotificationInfo
{
    [JsonPropertyName("campaignId")]
    public long CampaignId { get; set; }

    [JsonPropertyName("campaignName")]
    public string CampaignName { get; set; } = string.Empty;

    [JsonPropertyName("slug")]
    public string Slug { get; set; } = string.Empty;

    [JsonPropertyName("muted")]
    public bool Muted { get; set; }
}

public class CampaignNotificationUpdateInfo
{
    [JsonPropertyName("muted")]
    public bool Muted { get; set; }
}

/// <summary>The result of a poke (043): how many players were poked, their first names and the chat line (null when nobody).</summary>
public class PokeResultInfo
{
    [JsonPropertyName("poked")]
    public int Poked { get; set; }

    [JsonPropertyName("names")]
    public List<string> Names { get; set; } = new();

    [JsonPropertyName("item")]
    public ChatItemInfo? Item { get; set; }
}
