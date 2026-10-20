namespace Roll6.Domain.Interfaces;

/// <summary>A turn to close handed to the master's console (096). Built by the turn service; the dispatcher turns it into a run.</summary>
public sealed record GmJob(long CampaignId, int TurnNo, long MasterUserId, string CampaignName);

/// <summary>
/// Hands GM runs to the master's Roll6.Console (096, implemented in Application over the agents of the animation hub,
/// 086): whether the master's console is connected, queueing one run per campaign, which turn a campaign's run is
/// about, and stopping it when the master turns the mode off.
/// </summary>
public interface IGmDispatcher
{
    bool IsAgentConnected(long userId);

    /// <summary>Queues the run; false while a run of the same campaign is already queued or running.</summary>
    Task<bool> EnqueueAsync(GmJob job);

    /// <summary>The turn number of the campaign's queued or running run, else null.</summary>
    int? RunningTurnOf(long campaignId);

    /// <summary>Stops (or drops, while queued) the campaign's run; nothing when there is none.</summary>
    Task StopAsync(long campaignId);
}
