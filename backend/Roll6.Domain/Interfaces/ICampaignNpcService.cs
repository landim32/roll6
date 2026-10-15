using Roll6.DTO.CampaignNpc;

namespace Roll6.Domain.Interfaces;

public interface ICampaignNpcService
{
    Task<List<CampaignNpcInfo>> ListByCampaignAsync(long userId, long campaignId);
    Task<CampaignNpcInfo> AddAsync(long userId, CampaignNpcInsertInfo info);
    Task RemoveAsync(long userId, long campaignNpcId);
    /// <summary>Category and master of the NPC in the campaign (071); campaign master only.</summary>
    Task<CampaignNpcInfo> UpdateAsync(long userId, long campaignNpcId, CampaignNpcUpdateInfo info);
}
