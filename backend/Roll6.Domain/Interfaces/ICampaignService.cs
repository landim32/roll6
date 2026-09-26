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

    /// <summary>True for the master and for users with an approved character (who may follow the table in real time).</summary>
    Task<bool> CanReadAsync(long userId, long campaignId);

    /// <summary>Master: sets the map the players follow (017); publishes <c>map.current</c> when it changes.</summary>
    Task<CampaignInfo> SetCurrentMapAsync(long userId, long campaignId, CampaignCurrentMapInfo info);
}
