namespace Roll6.Domain.Notifications;

/// <summary>
/// A short name for a device that receives notifications (074): "Chrome · Android", "Safari · iPhone". Read from the
/// user agent the browser sent when it registered; anything unknown is "Navegador". Pure.
/// </summary>
public static class DeviceLabel
{
    public const string UNKNOWN = "Navegador";

    public static string From(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
            return UNKNOWN;
        var ua = userAgent;
        var browser = ua.Contains("Edg/", StringComparison.Ordinal) ? "Edge"
            : ua.Contains("OPR/", StringComparison.Ordinal) ? "Opera"
            : ua.Contains("SamsungBrowser", StringComparison.Ordinal) ? "Samsung Internet"
            : ua.Contains("Firefox/", StringComparison.Ordinal) || ua.Contains("FxiOS", StringComparison.Ordinal) ? "Firefox"
            : ua.Contains("CriOS", StringComparison.Ordinal) || ua.Contains("Chrome/", StringComparison.Ordinal) ? "Chrome"
            : ua.Contains("Safari/", StringComparison.Ordinal) ? "Safari"
            : null;
        var system = ua.Contains("iPhone", StringComparison.Ordinal) ? "iPhone"
            : ua.Contains("iPad", StringComparison.Ordinal) ? "iPad"
            : ua.Contains("Android", StringComparison.Ordinal) ? "Android"
            : ua.Contains("Windows", StringComparison.Ordinal) ? "Windows"
            : ua.Contains("Mac OS X", StringComparison.Ordinal) || ua.Contains("Macintosh", StringComparison.Ordinal) ? "Mac"
            : ua.Contains("CrOS", StringComparison.Ordinal) ? "ChromeOS"
            : ua.Contains("Linux", StringComparison.Ordinal) ? "Linux"
            : null;
        return (browser, system) switch
        {
            (null, null) => UNKNOWN,
            (null, _) => $"{UNKNOWN} · {system}",
            (_, null) => browser,
            _ => $"{browser} · {system}"
        };
    }
}
