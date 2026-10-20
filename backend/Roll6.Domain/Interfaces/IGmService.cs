using Roll6.Domain.Gm;

namespace Roll6.Domain.Interfaces;

/// <summary>
/// The GM mode of a campaign (096): the master's Claude closes the turn through his console whenever every approved
/// character has acted. The checks never throw into the write that triggered them.
/// </summary>
public interface IGmService
{
    /// <summary>
    /// Queues a GM run when the campaign has the mode on, is Active, its master's console is connected, every approved
    /// character has a valid action in the current turn and no run of the campaign is queued or running.
    /// </summary>
    Task CheckAsync(long campaignId, string reason);

    /// <summary>The master's console connected: <see cref="CheckAsync"/> on every campaign he masters with the mode on.</summary>
    Task CheckOwnerAsync(long masterUserId);

    /// <summary>The console took the run: the "começou" line in the chat and the running state to the table.</summary>
    Task StartedAsync(GmJob job);

    /// <summary>The run ended: nothing more when the turn advanced; else a line (and a notice to the master) saying why it is still open.</summary>
    Task CompleteAsync(GmJob job, GmOutcome outcome);
}
