namespace SimpleTabletopMap.Infra.Interfaces.Repository;

public interface ICampaignCharacterRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<TModel?> GetAsync(long campaignId, long characterId);
    Task<List<TModel>> ListByCampaignAsync(long campaignId, bool approvedOnly);

    /// <summary>Pending invites (Invited) of characters owned by the user.</summary>
    Task<List<TModel>> ListInvitesByUserAsync(long userId);

    /// <summary>True when the user owns a character approved in the campaign.</summary>
    Task<bool> HasApprovedCharacterAsync(long campaignId, long userId);

    /// <summary>Participations of the user's characters in the campaign (any status).</summary>
    Task<List<TModel>> ListByCampaignAndUserAsync(long campaignId, long userId);

    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteByCampaignAsync(long campaignId);
    Task DeleteByCharacterAsync(long characterId);
    Task DeleteAsync(long id);

    /// <summary>True when the character is approved in a campaign mastered by the user.</summary>
    Task<bool> IsApprovedInCampaignOfAsync(long characterId, long masterUserId);

    /// <summary>Lowers current life/energy above the new totals in every campaign of the character.</summary>
    Task ClampVitalsAsync(long characterId, int totalLife, int totalEnergy);
}
