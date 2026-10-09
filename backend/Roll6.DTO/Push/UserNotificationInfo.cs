using System.Text.Json.Serialization;

namespace Roll6.DTO.Push;

/// <summary>A notice in the bell (inbox): exactly what the Web Push carried.</summary>
public class UserNotificationInfo
{
    [JsonPropertyName("userNotificationId")]
    public long UserNotificationId { get; set; }

    [JsonPropertyName("campaignId")]
    public long? CampaignId { get; set; }

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("read")]
    public bool Read { get; set; }
}

public class UserNotificationPageInfo
{
    [JsonPropertyName("items")]
    public List<UserNotificationInfo> Items { get; set; } = new();

    [JsonPropertyName("unreadCount")]
    public int UnreadCount { get; set; }
}

/// <summary>Marks one notice (id) or all of them (null) as read.</summary>
public class UserNotificationReadInfo
{
    [JsonPropertyName("userNotificationId")]
    public long? UserNotificationId { get; set; }
}
