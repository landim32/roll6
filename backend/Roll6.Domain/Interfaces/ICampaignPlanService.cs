using Roll6.DTO.CampaignPlan;

namespace Roll6.Domain.Interfaces;

/// <summary>Campaign plan entries (018): master only.</summary>
public interface ICampaignPlanService
{
    Task<List<CampaignPlanInfo>> ListAsync(long userId, long campaignId);
    Task<CampaignPlanDetailInfo> GetByIdAsync(long userId, long campaignPlanId);
    Task<CampaignPlanDetailInfo> CreateAsync(long userId, CampaignPlanInsertInfo info);
    Task<CampaignPlanDetailInfo> UpdateAsync(long userId, long campaignPlanId, CampaignPlanUpdateInfo info);
    Task DeleteAsync(long userId, long campaignPlanId);
}
