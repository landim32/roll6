using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Meta;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class PageMetaServiceTests
{
    private const string BASE = "https://roll6.site";
    private const string IMAGE = "0123456789abcdef0123456789abcdef.png";

    private readonly Mock<IMapRepository<Map>> _maps = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaigns = new();
    private readonly Mock<IMapModelRepository<MapModel>> _models = new();
    private readonly Mock<IUserRepository<User>> _users = new();
    private readonly PageMetaService _service;

    private readonly Campaign _campaign = new() { CampaignId = 10, UserId = 1, Name = "A Torre", Slug = "a-torre", CurrentMapId = 30 };
    private readonly Map _map = new() { MapId = 30, CampaignId = 10, MapModelId = 50, Name = "Estrada 1", Slug = "estrada-1" };

    public PageMetaServiceTests()
    {
        _maps.Setup(r => r.GetBySlugAsync("estrada-1")).ReturnsAsync(_map);
        _maps.Setup(r => r.GetByIdAsync(30)).ReturnsAsync(_map);
        _campaigns.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(_campaign);
        _campaigns.Setup(r => r.GetBySlugAsync("a-torre")).ReturnsAsync(_campaign);
        _models.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(new MapModel { MapModelId = 50, Name = "Estrada", Image = IMAGE, GridWidth = 30, GridHeight = 20 });
        _users.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(new User { UserId = 1, Name = "Rodrigo" });
        _service = new PageMetaService(_maps.Object, _campaigns.Object, _models.Object, _users.Object);
    }

    [Theory]
    [InlineData("map/estrada-1")]
    [InlineData("/map/estrada-1/")]
    [InlineData("map/estrada-1?utm=whatsapp")]
    public async Task Map_ShowsTheMapAndItsCampaign(string path)
    {
        var meta = await _service.ForPathAsync(path, BASE);

        meta.Title.Should().Be("Estrada 1 — A Torre");
        meta.Description.Should().Be("Campanha A Torre, mestre Rodrigo. Mapa 30×20 hexágonos.");
        meta.Url.Should().Be($"{BASE}/map/estrada-1");
        meta.ImageUrl.Should().Be($"{BASE}/api/meta/image/map/estrada-1.jpg");
        (meta.ImageWidth, meta.ImageHeight, meta.ImageType).Should().Be((1200, 630, "image/jpeg"));
        meta.ImageAlt.Should().Be("Mapa Estrada 1");
    }

    [Fact]
    public async Task MapWithoutImage_UsesTheBrandImage()
    {
        _models.Setup(r => r.GetByIdAsync(50)).ReturnsAsync(new MapModel { MapModelId = 50, Name = "Estrada", GridWidth = 30, GridHeight = 20 });

        var meta = await _service.ForPathAsync("map/estrada-1", BASE);

        meta.Title.Should().Be("Estrada 1 — A Torre");
        meta.ImageUrl.Should().Be($"{BASE}/brand/og-default.png");
    }

    [Fact]
    public async Task DeletedMap_IsGeneric()
    {
        _map.Status = MapStatus.Deleted;

        (await _service.ForPathAsync("map/estrada-1", BASE)).Should().Be(PageMeta.Generic(BASE));
    }

    [Theory]
    [InlineData("")]
    [InlineData("/")]
    [InlineData("map/unknown")]
    [InlineData("campaign/unknown")]
    [InlineData("campaign")]
    [InlineData("foo/bar")]
    [InlineData("map/estrada-1/extra")]
    public async Task AnythingElse_IsGeneric(string path)
    {
        (await _service.ForPathAsync(path, BASE)).Should().Be(PageMeta.Generic(BASE));
    }

    [Fact]
    public async Task Campaign_ShowsItsCurrentMapImage()
    {
        var meta = await _service.ForPathAsync("campaign/a-torre", BASE);

        meta.Title.Should().Be("A Torre");
        meta.Description.Should().Be("Campanha A Torre, mestre Rodrigo.");
        meta.Url.Should().Be($"{BASE}/campaign/a-torre");
        meta.ImageUrl.Should().Be($"{BASE}/api/meta/image/map/estrada-1.jpg");
    }

    [Fact]
    public async Task CampaignWithoutCurrentMap_UsesTheBrandImage()
    {
        _campaign.CurrentMapId = null;

        var meta = await _service.ForPathAsync("campaign/a-torre", BASE);

        meta.Title.Should().Be("A Torre");
        meta.ImageUrl.Should().Be($"{BASE}/brand/og-default.png");
    }

    [Fact]
    public async Task RepositoryFailure_IsGeneric()
    {
        _maps.Setup(r => r.GetBySlugAsync("estrada-1")).ThrowsAsync(new InvalidOperationException("db down"));

        (await _service.ForPathAsync("map/estrada-1", BASE)).Should().Be(PageMeta.Generic(BASE));
    }

    [Fact]
    public async Task LongNames_AreCut()
    {
        _map.Name = string.Join(' ', Enumerable.Repeat("Masmorra", 20));

        var meta = await _service.ForPathAsync("map/estrada-1", BASE);

        meta.Title.Length.Should().BeLessThanOrEqualTo(PageMetaHtml.TITLE_MAX);
        meta.Title.Should().EndWith("…");
    }
}
