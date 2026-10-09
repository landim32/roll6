using FluentAssertions;
using Roll6.Domain.Meta;

namespace Roll6.Tests.Domain.Meta;

public class PageMetaHtmlTests
{
    private const string BASE = "https://roll6.site";

    private static PageMeta Map(string title = "Estrada 1 — A Torre", string description = "Campanha A Torre, mestre Rodrigo. Mapa 30×20 hexágonos.") =>
        new(title, description, $"{BASE}/map/estrada-1", $"{BASE}/api/meta/image/map/estrada-1.jpg", 1200, 630, "image/jpeg", "Mapa Estrada 1");

    [Fact]
    public void Truncate_KeepsShortTexts()
    {
        PageMetaHtml.Truncate("Estrada 1", 70).Should().Be("Estrada 1");
    }

    [Fact]
    public void Truncate_CutsAtTheLastWholeWord()
    {
        PageMetaHtml.Truncate("A masmorra esquecida do rei", 21).Should().Be("A masmorra esquecida…");
        PageMetaHtml.Truncate("A masmorra esquecida do rei", 18).Should().Be("A masmorra…");
    }

    [Fact]
    public void Truncate_NeverExceedsTheLimitPlusTheEllipsis()
    {
        PageMetaHtml.Truncate(new string('x', 300), 70).Should().HaveLength(70);
    }

    [Fact]
    public void Render_HasEveryTagWithAbsoluteUrls()
    {
        var html = PageMetaHtml.Render(Map());

        html.Should().ContainAll(
            "<meta name=\"description\" content=\"Campanha A Torre, mestre Rodrigo. Mapa 30×20 hexágonos.\">",
            "<link rel=\"canonical\" href=\"https://roll6.site/map/estrada-1\">",
            "<meta property=\"og:site_name\" content=\"Roll6\">",
            "<meta property=\"og:type\" content=\"website\">",
            "<meta property=\"og:locale\" content=\"pt_BR\">",
            "<meta property=\"og:title\" content=\"Estrada 1 — A Torre\">",
            "<meta property=\"og:url\" content=\"https://roll6.site/map/estrada-1\">",
            "<meta property=\"og:image\" content=\"https://roll6.site/api/meta/image/map/estrada-1.jpg\">",
            "<meta property=\"og:image:width\" content=\"1200\">",
            "<meta property=\"og:image:height\" content=\"630\">",
            "<meta property=\"og:image:type\" content=\"image/jpeg\">",
            "<meta property=\"og:image:alt\" content=\"Mapa Estrada 1\">",
            "<meta name=\"twitter:card\" content=\"summary_large_image\">",
            "<meta name=\"twitter:title\" content=\"Estrada 1 — A Torre\">",
            "<meta name=\"twitter:image\" content=\"https://roll6.site/api/meta/image/map/estrada-1.jpg\">");
    }

    [Fact]
    public void Render_EncodesSpecialCharacters()
    {
        var html = PageMetaHtml.Render(Map(title: "A <b>\"Torre\"</b> & 'cia'"));

        html.Should().NotContain("<b>").And.NotContain("\"Torre\"");
        html.Should().Contain("&lt;b&gt;").And.Contain("&amp;").And.Contain("&quot;");
    }

    [Fact]
    public void Generic_UsesTheBrandImage()
    {
        var html = PageMetaHtml.Render(PageMeta.Generic(BASE));

        html.Should().ContainAll(
            "<meta property=\"og:title\" content=\"Roll6\">",
            "<meta property=\"og:url\" content=\"https://roll6.site/\">",
            "<meta property=\"og:image\" content=\"https://roll6.site/brand/og-default.png\">",
            "<meta property=\"og:image:type\" content=\"image/png\">");
    }
}
