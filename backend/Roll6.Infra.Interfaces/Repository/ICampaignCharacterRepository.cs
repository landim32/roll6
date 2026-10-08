namespace Roll6.Infra.Interfaces.Repository;

public interface ICampaignCharacterRepository<TModel> where TModel : class
{
    Task<TModel?> GetByIdAsync(long id);
    Task<TModel?> GetAsync(long campaignId, long characterId);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    Task<List<TModel>> ListByCampaignAsync(long campaignId, bool approvedOnly);

    /// <summary>Pending invites (Invited) of characters owned by the user.</summary>
    Task<List<TModel>> ListInvitesByUserAsync(long userId);

    /// <summary>True when the user owns a character approved in the campaign.</summary>
    Task<bool> HasApprovedCharacterAsync(long campaignId, long userId);

    /// <summary>Participations of the user's characters in the campaign (any status).</summary>
    Task<List<TModel>> ListByCampaignAndUserAsync(long campaignId, long userId);

    /// <summary>Campaigns where the character has a participation (any status).</summary>
    Task<List<long>> ListCampaignIdsByCharacterAsync(long characterId);

    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteByCampaignAsync(long campaignId);
    Task DeleteByCharacterAsync(long characterId);
    Task DeleteAsync(long id);

    /// <summary>Lowers current life/energy above the new totals in every campaign of the character.</summary>
    Task ClampVitalsAsync(long characterId, int totalLife, int totalEnergy);

    /// <summary>
    /// The character's move changed from <paramref name="oldMove"/> to <paramref name="newMove"/>: the participations
    /// whose Deslocamento still equals the old move follow it; the adjusted ones keep their value (037).
    /// </summary>
    Task FollowMoveAsync(long characterId, int oldMove, int newMove);
}
