using Roll6.DTO.Turn;

namespace Roll6.Domain.Interfaces;

public interface ITurnService
{
    Task<TurnStateInfo> GetStateAsync(long userId, long campaignId);
    Task<List<TurnInfo>> ListAsync(long userId, long campaignId, int turnNo);

    /// <summary>Readable markdown of a turn (024); without turnNo, the turn in progress.</summary>
    Task<TurnSummaryInfo> GetSummaryAsync(long userId, long campaignId, int? turnNo);

    /// <summary>Narration of a turn, or of the latest finished turn that has one (029). Null when there is none.</summary>
    Task<TurnNarrationInfo?> GetNarrationAsync(long userId, long campaignId, int? turnNo);

    /// <summary>The whole table for an AI assistant (027): approved characters, NPC occurrences and the turn's actions.</summary>
    Task<TurnDataInfo> GetDataAsync(long userId, long campaignId, int? turnNo);

    /// <summary>Saves the result of the turn in one transaction and finishes it (027, master only).</summary>
    Task<TurnProcessResultInfo> ProcessAsync(long userId, long campaignId, TurnProcessInfo info);

    /// <summary>Finished turns before `before` (default: the turn in progress), newest first (028).</summary>
    Task<TurnHistoryPageInfo> GetHistoryAsync(long userId, long campaignId, int? before, int? limit);
    Task<TurnInfo> ActAsync(long userId, TurnActInfo info);

    /// <summary>"Ação repetida" (099): sets, replaces or (empty text) removes an actor's standing order.</summary>
    Task<TurnRepeatResultInfo> SetRepeatedAsync(long userId, TurnRepeatInfo info);
    Task<TurnResetResultInfo> ResetAsync(long userId, TurnPieceInfo info);
    Task<TurnFinishResultInfo> FinishAsync(long userId, long campaignId, TurnFinishInfo info);

    /// <summary>101: the master's "processing turn N" notice — start (Active campaign) or stop (with a reason).</summary>
    Task<TurnProcessingResultInfo> SetProcessingAsync(long userId, long campaignId, TurnProcessingInfo info);
    Task<TurnInfo> CreateAsync(long userId, TurnInsertInfo info);
    Task DeleteAsync(long userId, long turnId);

    /// <summary>Changes an entry of any turn (030, master only); pieces and values don't change.</summary>
    Task<TurnInfo> UpdateAsync(long userId, long turnId, TurnUpdateInfo info);

    /// <summary>Sets the turn in progress (030, master only); going back may discard later entries.</summary>
    Task<TurnSetCurrentResultInfo> SetCurrentAsync(long userId, long campaignId, TurnSetCurrentInfo info);
}
