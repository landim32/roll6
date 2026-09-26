using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.CampaignPlan;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Domain.Services;

public class CampaignPlanServiceTests
{
    private const long MASTER = 1;
    private const long PLAYER = 2;
    private const long CAMPAIGN = 10;
    private const long PLAN = 5;
    private const string IMAGE = "0123456789abcdef0123456789abcdef.png";

    private readonly Mock<ICampaignPlanRepository<CampaignPlan>> _repository = new();
    private readonly Mock<ICampaignRepository<Campaign>> _campaignRepository = new();
    private readonly Mock<IImageStorageAppService> _imageStorage = new();
    private readonly CampaignPlanService _service;

    public CampaignPlanServiceTests()
    {
        _campaignRepository.Setup(r => r.GetByIdAsync(CAMPAIGN)).ReturnsAsync(new Campaign { CampaignId = CAMPAIGN, UserId = MASTER, Name = "C" });
        _repository.Setup(r => r.GetByIdAsync(PLAN)).ReturnsAsync(() => new CampaignPlan
        {
            CampaignPlanId = PLAN, CampaignId = CAMPAIGN, Title = "Capítulo 1", Description = $"![mapa](roll6-image:{IMAGE})"
        });
        _repository.Setup(r => r.InsertAsync(It.IsAny<CampaignPlan>())).ReturnsAsync((CampaignPlan p) => { p.CampaignPlanId = 6; return p; });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<CampaignPlan>())).ReturnsAsync((CampaignPlan p) => p);
        _imageStorage.Setup(s => s.GetUrl(It.IsAny<string?>())).Returns((string? file) => file == null ? null : $"https://cdn/{file}?sig");
        _service = new CampaignPlanService(_repository.Object, _campaignRepository.Object, _imageStorage.Object);
    }

    [Fact]
    public async Task Create_Master_SavesAndReturnsTheImageUrls()
    {
        var result = await _service.CreateAsync(MASTER, new CampaignPlanInsertInfo
        {
            CampaignId = CAMPAIGN, Title = "Capítulo 2", Description = $"Texto ![x](roll6-image:{IMAGE})"
        });

        (result.CampaignPlanId, result.Title).Should().Be((6L, "Capítulo 2"));
        result.Description.Should().Contain($"roll6-image:{IMAGE}");
        result.ImageUrls.Should().Equal(new Dictionary<string, string> { [IMAGE] = $"https://cdn/{IMAGE}?sig" });
    }

    [Fact]
    public async Task List_Master_ReturnsTheEntriesWithoutDescriptions()
    {
        _repository.Setup(r => r.ListByCampaignAsync(CAMPAIGN)).ReturnsAsync(new List<CampaignPlan>
        {
            new() { CampaignPlanId = 5, CampaignId = CAMPAIGN, Title = "A", Description = "segredo" },
            new() { CampaignPlanId = 6, CampaignId = CAMPAIGN, Title = "B" }
        });

        var result = await _service.ListAsync(MASTER, CAMPAIGN);

        result.Select(p => p.Title).Should().Equal("A", "B");
        result.Should().AllBeOfType<CampaignPlanInfo>();
    }

    [Fact]
    public async Task UpdateAndGet_Master_Allowed()
    {
        var updated = await _service.UpdateAsync(MASTER, PLAN, new CampaignPlanUpdateInfo { Title = "Novo", Description = null });
        var read = await _service.GetByIdAsync(MASTER, PLAN);

        (updated.Title, updated.Description).Should().Be(("Novo", (string?)null));
        read.ImageUrls.Should().ContainKey(IMAGE);
    }

    [Fact]
    public async Task Delete_Master_Deletes()
    {
        await _service.DeleteAsync(MASTER, PLAN);

        _repository.Verify(r => r.DeleteAsync(PLAN), Times.Once);
    }

    [Fact]
    public async Task EveryOperation_ByAPlayer_Throws()
    {
        await _service.Invoking(s => s.ListAsync(PLAYER, CAMPAIGN)).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.GetByIdAsync(PLAYER, PLAN)).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.CreateAsync(PLAYER, new CampaignPlanInsertInfo { CampaignId = CAMPAIGN, Title = "X" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.UpdateAsync(PLAYER, PLAN, new CampaignPlanUpdateInfo { Title = "X" }))
            .Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.DeleteAsync(PLAYER, PLAN)).Should().ThrowAsync<UnauthorizedAccessException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<CampaignPlan>()), Times.Never);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<CampaignPlan>()), Times.Never);
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task Missing_PlanOrCampaign_ThrowsNotFound()
    {
        await _service.Invoking(s => s.GetByIdAsync(MASTER, 99)).Should().ThrowAsync<KeyNotFoundException>();
        await _service.Invoking(s => s.ListAsync(MASTER, 99)).Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Create_WithoutTitle_Throws()
    {
        await _service.Invoking(s => s.CreateAsync(MASTER, new CampaignPlanInsertInfo { CampaignId = CAMPAIGN, Title = " " }))
            .Should().ThrowAsync<DomainValidationException>();
    }
}
