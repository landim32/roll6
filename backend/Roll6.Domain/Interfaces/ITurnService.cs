using Roll6.DTO.Turn;

namespace Roll6.Domain.Interfaces;

public interface ITurnService
{
    Task<TurnStateInfo> GetStateAsync(long userId, long campaignId);
    Task<List<TurnInfo>> ListAsync(long userId, long campaignId, int turnNo);

    /// <summary>Readable markdown of a turn (024); without turnNo, the turn in progress.</summary>
    Task<TurnSummaryInfo> GetSummaryAsync(long userId, long campaignId, int? turnNo);
    Task<TurnInfo> ActAsync(long userId, TurnActInfo info);
    Task<TurnResetResultInfo> ResetAsync(long userId, TurnPieceInfo info);
    Task<TurnFinishResultInfo> FinishAsync(long userId, long campaignId, TurnFinishInfo info);
    Task<TurnInfo> CreateAsync(long userId, TurnInsertInfo info);
    Task DeleteAsync(long userId, long turnId);
}
