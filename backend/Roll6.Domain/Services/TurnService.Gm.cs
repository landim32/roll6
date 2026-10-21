using Roll6.Domain.Enums;
using Roll6.Domain.Gm;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Domain.Realtime;
using Roll6.DTO.Realtime;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Domain.Services;

/// <summary>
/// The GM mode (096): with <see cref="Campaign.GmMode"/> on, every saved action (and the toggle, and the master's
/// console connecting) checks whether every approved character has acted in the current turn; a complete turn of an
/// Active campaign whose master's console is connected becomes one GM run on that console (Q2 = A: nothing runs on a
/// partial turn). The run's start and its end — when the turn is still open — are lines of the chat (kind "gm"), and a
/// run that leaves the turn open also tells the master with the N9 notice.
/// </summary>
public partial class TurnService : IGmService
{
    public Task CheckAsync(long campaignId, string reason) => SafelyAsync(() => CheckCoreAsync(campaignId));

    private async Task CheckCoreAsync(long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId);
        if (campaign is not { GmMode: true, Status: CampaignStatus.Active })
            return;
        if (!_gm.IsAgentConnected(campaign.UserId))
            return;
        var (approved, acted) = await ActedAsync(campaign);
        // 099 (Q1 = B): actions repeated automatically at the turn start alone never hand the turn to the GM.
        var anyDeclared = (await _repository.ListByCampaignTurnAsync(campaign.CampaignId, campaign.CurrentTurn))
            .Any(e => e.TurnType == TurnType.Action && e.Repeated != RepeatSource.TurnStart);
        if (!GmTurn.Complete(approved, acted, anyDeclared))
            return;
        await _gm.EnqueueAsync(new GmJob(campaign.CampaignId, campaign.CurrentTurn, campaign.UserId, campaign.Name));
    }

    public async Task CheckOwnerAsync(long masterUserId)
    {
        foreach (var campaignId in await _campaignRepository.ListGmModeIdsByOwnerAsync(masterUserId))
            await CheckAsync(campaignId, "console");
    }

    /// <summary>
    /// The approved characters of the campaign and those with a valid action in the current turn — the one computation
    /// behind "Finalizar turno"'s pending list, the "Falta…" notice and the GM mode.
    /// </summary>
    private async Task<(List<long> Approved, HashSet<long> Acted)> ActedAsync(Campaign campaign)
    {
        var approved = (await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true))
            .Select(p => p.CharacterId).Distinct().ToList();
        var acted = (await _repository.ListByCampaignTurnAsync(campaign.CampaignId, campaign.CurrentTurn))
            .Where(e => e.TurnType == TurnType.Action && e.CharacterId.HasValue)
            .Select(e => e.CharacterId!.Value)
            .ToHashSet();
        return (approved, acted);
    }

    public async Task StartedAsync(GmJob job)
    {
        var campaign = await _campaignRepository.GetByIdAsync(job.CampaignId);
        if (campaign == null)
            return;
        await GmLineAsync(campaign, job.TurnNo, GmTurn.Started(job.TurnNo));
        await PublishGmChangedAsync(campaign, true, job.TurnNo);
    }

    public async Task CompleteAsync(GmJob job, GmOutcome outcome)
    {
        var campaign = await _campaignRepository.GetByIdAsync(job.CampaignId);
        if (campaign == null)
            return;
        // The turn advanced: the narration is the result and nothing more is said.
        if (campaign.CurrentTurn <= job.TurnNo)
        {
            var (line, reason) = GmEnding(job.TurnNo, outcome);
            await GmLineAsync(campaign, job.TurnNo, line);
            // The master who turned the mode off needs no notice about it.
            if (reason != null)
                _queue.Enqueue(TableNotices.Gm(campaign.CampaignId, campaign.UserId, job.TurnNo, reason));
        }
        await PublishGmChangedAsync(campaign, false, job.TurnNo);
    }

    /// <summary>The chat line of a run that left the turn open, and the notice reason (null = no notice).</summary>
    public static (string Line, string? Reason) GmEnding(int turnNo, GmOutcome outcome)
    {
        if (outcome.StoppedByMaster)
            return (GmTurn.Stopped(), null);
        if (outcome.TimedOut)
            return (GmTurn.TimedOut(turnNo), GmTurn.TIMED_OUT);
        if (outcome.Kind != RequestOutcomeInfo.DONE)
        {
            var failure = GmTurn.FailureReason(outcome.Message, outcome.PermissionDenials);
            return (GmTurn.Failed(turnNo, failure), failure);
        }
        if (outcome.Text.Trim() == GmTurn.GM_NOT_CONFIGURED)
            return (GmTurn.NotConfigured(turnNo), "a skill gm não está configurada no repositório do mestre");
        return (GmTurn.NotClosed(turnNo, outcome.Text), "o GM terminou sem fechar o turno");
    }

    /// <summary>A line of the GM in the chat: the master's user, shown as "GM", to the whole group, no notice.</summary>
    private async Task GmLineAsync(Campaign campaign, int turnNo, string text)
    {
        var turn = Turn.GmNotice(campaign.CampaignId, campaign.CurrentMapId, turnNo, campaign.UserId, text);
        var saved = await SaveEntryAsync(turn, null);
        var item = (await MapChatAsync(campaign, campaign.UserId, new List<Turn> { saved })).Single();
        await PublishEntryAsync(campaign, campaign.UserId, saved, item, TableEventType.CHAT_MESSAGE);
    }

    private Task PublishGmChangedAsync(Campaign campaign, bool running, int turnNo) =>
        _notifier.PublishAsync(TableEvents.Create(TableEventType.GM_CHANGED, campaign.CampaignId, campaign.UserId,
            data: new { running, turnNo }));
}
