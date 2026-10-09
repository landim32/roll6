using Roll6.Domain.Enums;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Meta;
using Roll6.Domain.Models;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// Link previews of the table's addresses (040), read by crawlers without login: a campaign map shows its name, its
/// campaign, the master, its grid and its picture; a campaign shows its name, the master and its current map's
/// picture. Nothing else of the table (pieces, NPCs, sheets, turns). Anything missing, deleted or failing is the
/// generic preview, so the page never shows a broken one.
/// </summary>
public class PageMetaService : IPageMetaService
{
    private readonly IMapRepository<Map> _mapRepository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly IUserRepository<User> _userRepository;

    public PageMetaService(IMapRepository<Map> mapRepository, ICampaignRepository<Campaign> campaignRepository,
        IMapModelRepository<MapModel> mapModelRepository, IUserRepository<User> userRepository)
    {
        _mapRepository = mapRepository;
        _campaignRepository = campaignRepository;
        _mapModelRepository = mapModelRepository;
        _userRepository = userRepository;
    }

    public async Task<PageMeta> ForPathAsync(string path, string baseUrl)
    {
        try
        {
            var segments = (path ?? string.Empty).Split('?', '#')[0]
                .Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length != 2)
                return PageMeta.Generic(baseUrl);
            var slug = Uri.UnescapeDataString(segments[1]);
            return segments[0] switch
            {
                "map" => await ForMapAsync(slug, baseUrl),
                "campaign" => await ForCampaignAsync(slug, baseUrl),
                _ => PageMeta.Generic(baseUrl)
            };
        }
        catch
        {
            return PageMeta.Generic(baseUrl);
        }
    }

    public async Task<string?> MapImageAsync(string mapSlug)
    {
        var map = await _mapRepository.GetBySlugAsync(mapSlug);
        if (map == null || map.Status == MapStatus.Deleted)
            return null;
        return (await _mapModelRepository.GetByIdAsync(map.MapModelId))?.Image;
    }

    /// <summary>URL of the 1200×630 picture of a map (MetaController), stable because slugs never change (029).</summary>
    public static string MapImageUrl(string baseUrl, string mapSlug) =>
        $"{baseUrl}/api/meta/image/map/{Uri.EscapeDataString(mapSlug)}.jpg";

    private async Task<PageMeta> ForMapAsync(string slug, string baseUrl)
    {
        var map = await _mapRepository.GetBySlugAsync(slug);
        if (map == null || map.Status == MapStatus.Deleted)
            return PageMeta.Generic(baseUrl);
        var campaign = await _campaignRepository.GetByIdAsync(map.CampaignId);
        var model = await _mapModelRepository.GetByIdAsync(map.MapModelId);
        if (campaign == null || model == null)
            return PageMeta.Generic(baseUrl);
        var master = await _userRepository.GetByIdAsync(campaign.UserId);

        var meta = new PageMeta(
            PageMetaHtml.Truncate($"{map.Name} — {campaign.Name}", PageMetaHtml.TITLE_MAX),
            PageMetaHtml.Truncate($"{CampaignLine(campaign, master)} Mapa {model.GridWidth}×{model.GridHeight} hexágonos.",
                PageMetaHtml.DESCRIPTION_MAX),
            $"{baseUrl}/map/{Uri.EscapeDataString(map.Slug)}",
            string.Empty, 0, 0, string.Empty, $"Mapa {map.Name}");
        return WithImage(meta, baseUrl, model.Image != null ? map.Slug : null);
    }

    private async Task<PageMeta> ForCampaignAsync(string slug, string baseUrl)
    {
        var campaign = await _campaignRepository.GetBySlugAsync(slug);
        if (campaign == null)
            return PageMeta.Generic(baseUrl);
        var master = await _userRepository.GetByIdAsync(campaign.UserId);
        var current = campaign.CurrentMapId is long mapId ? await _mapRepository.GetByIdAsync(mapId) : null;
        if (current?.Status == MapStatus.Deleted)
            current = null;
        var model = current != null ? await _mapModelRepository.GetByIdAsync(current.MapModelId) : null;

        var meta = new PageMeta(
            PageMetaHtml.Truncate(campaign.Name, PageMetaHtml.TITLE_MAX),
            PageMetaHtml.Truncate(CampaignLine(campaign, master), PageMetaHtml.DESCRIPTION_MAX),
            $"{baseUrl}/campaign/{Uri.EscapeDataString(campaign.Slug)}",
            string.Empty, 0, 0, string.Empty, current != null ? $"Mapa {current.Name}" : campaign.Name);
        return WithImage(meta, baseUrl, model?.Image != null ? current!.Slug : null);
    }

    private static string CampaignLine(Campaign campaign, User? master) =>
        master != null ? $"Campanha {campaign.Name}, mestre {master.Name}." : $"Campanha {campaign.Name}.";

    /// <summary>The map's 1200×630 picture when it has one, else the brand's.</summary>
    private static PageMeta WithImage(PageMeta meta, string baseUrl, string? mapSlug)
    {
        if (mapSlug != null)
            return meta with
            {
                ImageUrl = MapImageUrl(baseUrl, mapSlug),
                ImageWidth = PageMeta.IMAGE_WIDTH,
                ImageHeight = PageMeta.IMAGE_HEIGHT,
                ImageType = "image/jpeg"
            };
        var generic = PageMeta.Generic(baseUrl);
        return meta with
        {
            ImageUrl = generic.ImageUrl,
            ImageWidth = generic.ImageWidth,
            ImageHeight = generic.ImageHeight,
            ImageType = generic.ImageType
        };
    }
}
