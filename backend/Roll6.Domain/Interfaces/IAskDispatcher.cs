namespace Roll6.Domain.Interfaces;

/// <summary>
/// A question handed to the master's console (093). Built by the chat; the dispatcher turns it into a read-only run.
/// </summary>
public sealed record AskJob(long CampaignId, long TurnId, long MasterUserId, string CampaignName, string SpeakerName, string Text);

/// <summary>
/// Hands questions to the master's Roll6.Console (093, implemented in Application over the agents of the animation
/// hub, 086): whether the master's console is connected, queueing a question, and stopping one that timed out.
/// </summary>
public interface IAskDispatcher
{
    bool IsAgentConnected(long userId);
    Task EnqueueAsync(AskJob job);
    Task StopAsync(long turnId);
}
