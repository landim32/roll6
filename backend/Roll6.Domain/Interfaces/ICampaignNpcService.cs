using Roll6.DTO.CampaignNpc;

namespace Roll6.Domain.Interfaces;

public interface ICampaignNpcService
{
    Task<List<CampaignNpcInfo>> ListByCampaignAsync(long userId, long campaignId);
    Task<CampaignNpcInfo> AddAsync(long userId, CampaignNpcInsertInfo info);
    Task RemoveAsync(long userId, long campaignNpcId);
}
