namespace Roll6.Infra.Interfaces.Repository;

public interface IMapNpcRepository<TModel> where TModel : class
{
    /// <summary>Any instance, removed ones included (051): the turn entries of a removed instance still need its name.</summary>
    Task<TModel?> GetByIdAsync(long id);
    Task<List<TModel>> ListByIdsAsync(IEnumerable<long> ids);
    /// <summary>The active (not removed) instances on the map.</summary>
    Task<List<TModel>> ListByMapAsync(long mapId);
    /// <summary>Active instances on the campaign's non-deleted maps with a repeated action (099).</summary>
    Task<List<TModel>> ListRepeatingAsync(long campaignId);
    /// <summary>Active occurrences of the NPC on any map of the campaign.</summary>
    Task<List<long>> ListIdsByCampaignAndNpcAsync(long campaignId, long npcId);
    /// <summary>Active instances per NPC across the campaign's maps (051, "Retirar da campanha" tells how many leave).</summary>
    Task<Dictionary<long, int>> CountByCampaignAsync(long campaignId);
    /// <summary>Lowers the current life/energy of the NPC's occurrences above its new totals (026).</summary>
    Task ClampVitalsAsync(long npcId, int totalLife, int totalEnergy);
    /// <summary>Active instances still at the NPC's old move follow its new one (051, like 037 for characters).</summary>
    Task FollowMoveAsync(long npcId, int oldMove, int newMove);
    /// <summary>Hard-deletes every instance of the NPC, removed ones included (only when the NPC leaves the library).</summary>
    Task DeleteByNpcAsync(long npcId);
    Task<TModel> InsertAsync(TModel entity);
    Task<TModel> UpdateAsync(TModel entity);
    Task DeleteAsync(long id);
    Task DeleteRangeAsync(IEnumerable<long> ids);
    Task DeleteByMapIdsAsync(IEnumerable<long> mapIds);
}
