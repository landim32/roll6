using Roll6.DTO.Realtime;

namespace Roll6.Infra.Interfaces.AppServices;

/// <summary>
/// Pushes table events to the connected clients of a campaign (017). Called after the change is saved; it never
/// throws — a failure to notify must not fail the request.
/// </summary>
public interface IRealtimeNotifier
{
    Task PublishAsync(TableEventInfo tableEvent);

    /// <summary>Stops sending the campaign's events to every connection of the user (lost access).</summary>
    Task RemoveUserFromCampaignAsync(long userId, long campaignId);
}
