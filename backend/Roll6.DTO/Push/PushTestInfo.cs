using System.Text.Json.Serialization;

namespace Roll6.DTO.Push;

/// <summary>A device of the user that receives notifications (074, the device list of "Notificações").</summary>
public class PushDeviceInfo
{
    [JsonPropertyName("pushSubscriptionId")]
    public long PushSubscriptionId { get; set; }

    /// <summary>"Chrome · Android", from the browser's user agent.</summary>
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    /// <summary>Returned to its owner only, so the page knows which row is this browser.</summary>
    [JsonPropertyName("endpoint")]
    public string Endpoint { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("lastSuccessAt")]
    public DateTime? LastSuccessAt { get; set; }

    [JsonPropertyName("failureCount")]
    public int FailureCount { get; set; }

    /// <summary>Too many failures in a row: it gets no pushes until a test succeeds.</summary>
    [JsonPropertyName("skipped")]
    public bool Skipped { get; set; }
}

/// <summary>Body of <c>POST /api/push/test</c>: one device by its endpoint, or null for every device of the user.</summary>
public class PushTestInfo
{
    [JsonPropertyName("endpoint")]
    public string? Endpoint { get; set; }
}

/// <summary>How each device answered a test or a simulation (074).</summary>
public class PushTestResultInfo
{
    [JsonPropertyName("devices")]
    public List<PushTestDeviceInfo> Devices { get; set; } = new();
}

public class PushTestDeviceInfo
{
    [JsonPropertyName("pushSubscriptionId")]
    public long PushSubscriptionId { get; set; }

    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    /// <summary>sent | gone (the browser dropped it; the device was removed) | failed</summary>
    [JsonPropertyName("result")]
    public string Result { get; set; } = string.Empty;
}

/// <summary>Body of <c>POST /api/campaign/{id}/notifications/simulate</c> (074).</summary>
public class NotificationSimulateInfo
{
    /// <summary>message | action | pending | pendingLast | turnFinished | life | fatigue | poke | pokeMaster</summary>
    [JsonPropertyName("kind")]
    public string? Kind { get; set; }
}

/// <summary>What "Falta…" would say now to each player still missing in the turn (074, master's preview).</summary>
public class TurnNoticePreviewInfo
{
    [JsonPropertyName("turnNo")]
    public int TurnNo { get; set; }

    [JsonPropertyName("approved")]
    public int Approved { get; set; }

    [JsonPropertyName("acted")]
    public int Acted { get; set; }

    [JsonPropertyName("threshold")]
    public int Threshold { get; set; }

    [JsonPropertyName("majorityReached")]
    public bool MajorityReached { get; set; }

    [JsonPropertyName("pending")]
    public List<TurnNoticePendingInfo> Pending { get; set; } = new();
}

public class TurnNoticePendingInfo
{
    [JsonPropertyName("userId")]
    public long UserId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("characters")]
    public List<string> Characters { get; set; } = new();

    /// <summary>The "Falta…" text the next first action would send; null before the majority.</summary>
    [JsonPropertyName("body")]
    public string? Body { get; set; }
}
