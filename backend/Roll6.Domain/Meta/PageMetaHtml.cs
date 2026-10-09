using System.Text;
using System.Text.Encodings.Web;
using System.Text.Unicode;

namespace Roll6.Domain.Meta;

/// <summary>
/// The &lt;head&gt; fragment of a link preview (040): Open Graph + Twitter tags, description and canonical URL. Every
/// value is HTML-encoded (names come from users); accents are kept as they are.
/// </summary>
public static class PageMetaHtml
{
    public const int TITLE_MAX = 70;
    public const int DESCRIPTION_MAX = 200;
    private const string ELLIPSIS = "…";

    private static readonly HtmlEncoder ENCODER = HtmlEncoder.Create(UnicodeRanges.All);

    /// <summary>The text as is when it fits, else cut at the last whole word with "…" (never longer than <paramref name="max"/>).</summary>
    public static string Truncate(string text, int max)
    {
        text = text.Trim();
        if (text.Length <= max)
            return text;
        var cut = text[..(max - ELLIPSIS.Length)];
        // Cut back to the last whole word, unless the cut already ends right before a space.
        var lastSpace = cut.LastIndexOf(' ');
        if (text[cut.Length] != ' ' && lastSpace > 0)
            cut = cut[..lastSpace];
        return cut.TrimEnd(' ', ',', '.', ';', ':', '—', '-') + ELLIPSIS;
    }

    public static string Render(PageMeta meta)
    {
        var html = new StringBuilder();
        void Name(string name, string value) => html.Append($"<meta name=\"{name}\" content=\"{ENCODER.Encode(value)}\">\n");
        void Property(string property, string value) => html.Append($"<meta property=\"{property}\" content=\"{ENCODER.Encode(value)}\">\n");

        Name("description", meta.Description);
        html.Append($"<link rel=\"canonical\" href=\"{ENCODER.Encode(meta.Url)}\">\n");
        Property("og:site_name", PageMeta.SITE_NAME);
        Property("og:type", "website");
        Property("og:locale", "pt_BR");
        Property("og:title", meta.Title);
        Property("og:description", meta.Description);
        Property("og:url", meta.Url);
        Property("og:image", meta.ImageUrl);
        Property("og:image:width", meta.ImageWidth.ToString());
        Property("og:image:height", meta.ImageHeight.ToString());
        Property("og:image:type", meta.ImageType);
        Property("og:image:alt", meta.ImageAlt);
        Name("twitter:card", "summary_large_image");
        Name("twitter:title", meta.Title);
        Name("twitter:description", meta.Description);
        Name("twitter:image", meta.ImageUrl);
        return html.ToString();
    }
}
