using Roll6.DTO.Turn;

namespace Roll6.Domain.Interfaces;

public interface ITurnService
{
    Task<TurnStateInfo> GetStateAsync(long userId, long campaignId);
    Task<List<TurnInfo>> ListAsync(long userId, long campaignId, int turnNo);

    /// <summary>Readable markdown of a turn (024); without turnNo, the turn in progress.</summary>
    Task<TurnSummaryInfo> GetSummaryAsync(long userId, long campaignId, int? turnNo);

    /// <summary>The whole table for an AI assistant (027): approved characters, NPC occurrences and the turn's actions.</summary>
    Task<TurnDataInfo> GetDataAsync(long userId, long campaignId, int? turnNo);

    /// <summary>Saves the result of the turn in one transaction and finishes it (027, master only).</summary>
    Task<TurnProcessResultInfo> ProcessAsync(long userId, long campaignId, TurnProcessInfo info);

    /// <summary>Finished turns before `before` (default: the turn in progress), newest first (028).</summary>
    Task<TurnHistoryPageInfo> GetHistoryAsync(long userId, long campaignId, int? before, int? limit);
    Task<TurnInfo> ActAsync(long userId, TurnActInfo info);
    Task<TurnResetResultInfo> ResetAsync(long userId, TurnPieceInfo info);
    Task<TurnFinishResultInfo> FinishAsync(long userId, long campaignId, TurnFinishInfo info);
    Task<TurnInfo> CreateAsync(long userId, TurnInsertInfo info);
    Task DeleteAsync(long userId, long turnId);
}
