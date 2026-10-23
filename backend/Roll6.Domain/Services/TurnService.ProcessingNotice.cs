using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.Domain.Turns;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;

namespace Roll6.Domain.Services;

/// <summary>
/// 101: the master (or his Claude) tells the table he is processing the turn in progress, or that he stopped without
/// closing it. A blue GM-style chat line and the footer badge; nothing is blocked (Q1 = A) and no push goes out
/// (Q2 = A). Closing the turn by any path ends the notice (the registry only counts the current turn).
/// </summary>
public partial class TurnService
{
    public async Task<TurnProcessingResultInfo> SetProcessingAsync(long userId, long campaignId, TurnProcessingInfo info)
    {
        var campaign = await GetMasteredCampaignAsync(userId, campaignId);
        var now = DateTime.UtcNow;
        var turnNo = campaign.CurrentTurn;
        if (info.Processing)
        {
            campaign.EnsurePlayable();
            // FR-010: the GM mode already says it is processing this turn.
            if (_gm.RunningTurnOf(campaign.CampaignId) == turnNo)
                return new TurnProcessingResultInfo { Ignored = TurnProcessingTexts.IGNORED_GM };
            if (_processing.Start(campaign.CampaignId, turnNo, userId, now))
            {
                await GmLineAsync(campaign, turnNo, TurnProcessingTexts.Started(turnNo));
                await PublishProcessingAsync(campaign, userId, turnNo, true);
            }
            var current = _processing.Current(campaign.CampaignId, turnNo, now);
            return new TurnProcessingResultInfo { ProcessingTurn = current?.TurnNo, ProcessingUntil = current?.Until };
        }

        var reason = info.Reason?.Trim();
        if (reason is { Length: > TurnProcessingTexts.MAX_REASON })
            throw new DomainValidationException("reason", TurnProcessingTexts.REASON_TOO_LONG);
        var stopped = _processing.Stop(campaign.CampaignId, turnNo, now);
        if (stopped.HasValue)
        {
            await GmLineAsync(campaign, stopped.Value, TurnProcessingTexts.Stopped(stopped.Value, reason));
            await PublishProcessingAsync(campaign, userId, stopped.Value, false);
        }
        return new TurnProcessingResultInfo();
    }

    private Task PublishProcessingAsync(Campaign campaign, long userId, int turnNo, bool processing) =>
        _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_PROCESSING, campaign.CampaignId, userId,
            data: new { turnNo, processing }));
}
