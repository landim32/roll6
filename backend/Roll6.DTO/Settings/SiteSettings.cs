namespace Roll6.DTO.Settings;

/// <summary>
/// The public site (040): absolute URLs of the link previews (og:url, og:image, canonical). Empty means "the host
/// the request came through" (X-Forwarded-Proto + Host behind the nginx).
/// </summary>
public class SiteSettings
{
    public string BaseUrl { get; set; } = string.Empty;
}
