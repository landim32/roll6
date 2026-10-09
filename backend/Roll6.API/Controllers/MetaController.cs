using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Meta;
using Roll6.DTO.Settings;
using Roll6.Infra.Interfaces.AppServices;

namespace Roll6.API.Controllers;

/// <summary>
/// Link previews (040) for crawlers that read only the first HTML (messaging apps, social networks, search engines):
/// no login, by design — they expose only the map/campaign name, the master, the grid and the map picture. The nginx
/// puts <c>head</c> into the SPA's index.html through SSI. Never an error page: a robot can't read ProblemDetails, so
/// anything missing or failing is the generic preview or the brand picture. Not exposed through MCP.
/// </summary>
[AllowAnonymous]
public class MetaController : ApiControllerBase
{
    private const int WEEK_SECONDS = 7 * 24 * 60 * 60;

    private readonly IPageMetaService _pageMeta;
    private readonly IPreviewImageRenderer _renderer;
    private readonly SiteSettings _site;
    private readonly ILogger<MetaController> _logger;

    public MetaController(IPageMetaService pageMeta, IPreviewImageRenderer renderer, IOptions<SiteSettings> site,
        ILogger<MetaController> logger)
    {
        _pageMeta = pageMeta;
        _renderer = renderer;
        _site = site.Value;
        _logger = logger;
    }

    /// <summary>The &lt;head&gt; tags of the page at <c>/{path}</c> (map/{slug}, campaign/{slug}, else generic).</summary>
    [HttpGet("head/{**path}")]
    [Produces("text/html")]
    public async Task<IActionResult> Head(string? path)
    {
        var baseUrl = BaseUrl();
        PageMeta meta;
        try
        {
            meta = await _pageMeta.ForPathAsync(path ?? string.Empty, baseUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Link preview of {Path} failed", path);
            meta = PageMeta.Generic(baseUrl);
        }
        return Content(PageMetaHtml.Render(meta), "text/html; charset=utf-8");
    }

    /// <summary>The 1200×630 JPEG of a map for previews; the brand picture when there is none.</summary>
    [HttpGet("image/map/{slug}.jpg")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> MapImage(string slug)
    {
        try
        {
            var fileName = await _pageMeta.MapImageAsync(slug);
            var bytes = fileName != null ? await _renderer.RenderMapAsync(fileName) : null;
            if (bytes != null)
            {
                Response.Headers.CacheControl = $"public, max-age={WEEK_SECONDS}";
                return File(bytes, "image/jpeg");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Preview image of map {Slug} failed", slug);
        }
        return Redirect(PageMeta.GENERIC_IMAGE_PATH);
    }

    /// <summary>The public site address: <c>Site:BaseUrl</c>, else the scheme and host the request came through.</summary>
    private string BaseUrl()
    {
        if (!string.IsNullOrWhiteSpace(_site.BaseUrl))
            return _site.BaseUrl.TrimEnd('/');
        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        return $"{scheme}://{Request.Host}";
    }
}
