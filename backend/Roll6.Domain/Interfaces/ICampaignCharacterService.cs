using Roll6.DTO.CampaignCharacter;

namespace Roll6.Domain.Interfaces;

public interface ICampaignCharacterService
{
    Task<CampaignCharacterInfo> RequestAccessAsync(long userId, CampaignCharacterRequestInfo info);
    Task<CampaignCharacterInfo> ApproveRequestAsync(long userId, long campaignCharacterId);
    Task<CampaignCharacterInfo> DenyRequestAsync(long userId, long campaignCharacterId);
    Task<CampaignCharacterInfo> InviteAsync(long userId, CampaignCharacterRequestInfo info);
    Task<CampaignCharacterInfo> AcceptInviteAsync(long userId, long campaignCharacterId);
    Task<CampaignCharacterInfo> DeclineInviteAsync(long userId, long campaignCharacterId);
    Task<List<CampaignCharacterInfo>> ListInvitesAsync(long userId);
    Task<List<CampaignCharacterInfo>> ListByCampaignAsync(long userId, long campaignId);
    Task<List<CampaignCharacterInfo>> ListMineAsync(long userId, long campaignId);
    Task RemoveAsync(long userId, long campaignCharacterId);
    Task<CampaignCharacterDetailInfo> GetByIdAsync(long userId, long campaignCharacterId);
    Task<CampaignCharacterDetailInfo> UpdateAsync(long userId, long campaignCharacterId, CampaignCharacterUpdateInfo info);
}
