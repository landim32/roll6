namespace Roll6.Domain.Meta;

/// <summary>
/// What a shared link of the site shows (040): title, description, the page's own URL and its picture. Built from
/// the map/campaign or the generic one; only these fields ever leave the server through a preview (FR-005).
/// </summary>
public sealed record PageMeta(
    string Title,
    string Description,
    string Url,
    string ImageUrl,
    int ImageWidth,
    int ImageHeight,
    string ImageType,
    string ImageAlt)
{
    public const string SITE_NAME = "Roll6";
    public const string GENERIC_DESCRIPTION = "Mesa virtual simples para RPG com mapas hexagonais.";
    /// <summary>The brand's own preview picture, served from the SPA's public folder.</summary>
    public const string GENERIC_IMAGE_PATH = "/brand/og-default.png";
    public const int IMAGE_WIDTH = 1200;
    public const int IMAGE_HEIGHT = 630;

    public static PageMeta Generic(string baseUrl) => new(
        SITE_NAME, GENERIC_DESCRIPTION, $"{baseUrl}/", $"{baseUrl}{GENERIC_IMAGE_PATH}",
        IMAGE_WIDTH, IMAGE_HEIGHT, "image/png", SITE_NAME);
}
