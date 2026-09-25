using Roll6.DTO.Campaign;
using Roll6.DTO.Common;

namespace Roll6.Domain.Interfaces;

public interface ICampaignService
{
    /// <summary>All campaigns of all users (feature 005), or only those of <paramref name="ownerUserId"/>; optional name search.</summary>
    Task<PagedList<CampaignInfo>> ListAsync(PageQuery query, long? ownerUserId = null);
    Task<CampaignInfo> GetByIdAsync(long campaignId);
    Task<CampaignInfo> CreateAsync(long userId, CampaignInsertInfo info);
    Task<CampaignInfo> RenameAsync(long userId, long campaignId, CampaignInsertInfo info);
    Task<CampaignInfo> SetOpenAsync(long userId, long campaignId, CampaignOpenInfo info);
    Task DeleteAsync(long userId, long campaignId);
}
