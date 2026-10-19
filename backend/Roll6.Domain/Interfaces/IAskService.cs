using Roll6.DTO.Chat;

namespace Roll6.Domain.Interfaces;

/// <summary>
/// "Perguntar" (093): questions to the campaign master's local Claude, answered through his Roll6.Console; questions and
/// answers are entries of the campaign chat, a private one a whisper to the master.
/// </summary>
public interface IAskService
{
    Task<ChatItemInfo> AskAsync(long userId, long campaignId, ChatAskInfo info);
    Task<AskStatusInfo> StatusAsync(long userId, long campaignId);
    /// <summary>The console answered: the answer is stored and the question marked answered (only from waiting).</summary>
    Task CompleteAsync(long turnId, string text);
    /// <summary>The question could not be answered (error, dropped console, timeout); only from waiting.</summary>
    Task FailAsync(long turnId);
    /// <summary>Fails every question waiting for longer than <see cref="Services.TurnService.ASK_TIMEOUT"/>; returns their ids.</summary>
    Task<List<long>> FailExpiredAsync(DateTime now);
    Task<ChatItemInfo> EditAnswerAsync(long userId, long turnId, ChatAnswerEditInfo info);
}
