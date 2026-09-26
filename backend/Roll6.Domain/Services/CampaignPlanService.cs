using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.CampaignPlan;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// Campaign plan entries (018). The plan holds the master's secrets: only the campaign master reads or changes
/// it. Images in the markdown are resolved to temporary URLs on every read.
/// </summary>
public class CampaignPlanService : ICampaignPlanService
{
    private readonly ICampaignPlanRepository<CampaignPlan> _repository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly IImageStorageAppService _imageStorage;

    public CampaignPlanService(
        ICampaignPlanRepository<CampaignPlan> repository,
        ICampaignRepository<Campaign> campaignRepository,
        IImageStorageAppService imageStorage)
    {
        _repository = repository;
        _campaignRepository = campaignRepository;
        _imageStorage = imageStorage;
    }

    public async Task<List<CampaignPlanInfo>> ListAsync(long userId, long campaignId)
    {
        await EnsureMasterAsync(userId, campaignId);
        return (await _repository.ListByCampaignAsync(campaignId)).Select(MapToInfo).ToList();
    }

    public async Task<CampaignPlanDetailInfo> GetByIdAsync(long userId, long campaignPlanId)
    {
        return MapToDetail(await GetOwnedAsync(userId, campaignPlanId));
    }

    public async Task<CampaignPlanDetailInfo> CreateAsync(long userId, CampaignPlanInsertInfo info)
    {
        await EnsureMasterAsync(userId, info.CampaignId);
        var plan = CampaignPlan.Create(info.CampaignId, info.Title, info.Description);
        return MapToDetail(await _repository.InsertAsync(plan));
    }

    public async Task<CampaignPlanDetailInfo> UpdateAsync(long userId, long campaignPlanId, CampaignPlanUpdateInfo info)
    {
        var plan = await GetOwnedAsync(userId, campaignPlanId);
        plan.Update(info.Title, info.Description);
        return MapToDetail(await _repository.UpdateAsync(plan));
    }

    public async Task DeleteAsync(long userId, long campaignPlanId)
    {
        var plan = await GetOwnedAsync(userId, campaignPlanId);
        await _repository.DeleteAsync(plan.CampaignPlanId);
    }

    private async Task<CampaignPlan> GetOwnedAsync(long userId, long campaignPlanId)
    {
        var plan = await _repository.GetByIdAsync(campaignPlanId)
            ?? throw new KeyNotFoundException("Plano não encontrado.");
        await EnsureMasterAsync(userId, plan.CampaignId);
        return plan;
    }

    private async Task EnsureMasterAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre da campanha pode ver e alterar o plano.");
    }

    private static CampaignPlanInfo MapToInfo(CampaignPlan plan) => new()
    {
        CampaignPlanId = plan.CampaignPlanId,
        CampaignId = plan.CampaignId,
        Title = plan.Title,
        CreatedAt = plan.CreatedAt,
        ChangedAt = plan.ChangedAt
    };

    private CampaignPlanDetailInfo MapToDetail(CampaignPlan plan) => new()
    {
        CampaignPlanId = plan.CampaignPlanId,
        CampaignId = plan.CampaignId,
        Title = plan.Title,
        CreatedAt = plan.CreatedAt,
        ChangedAt = plan.ChangedAt,
        Description = plan.Description,
        ImageUrls = plan.ImageFileNames()
            .Select(fileName => (fileName, url: _imageStorage.GetUrl(fileName)))
            .Where(image => image.url != null)
            .ToDictionary(image => image.fileName, image => image.url!)
    };
}
