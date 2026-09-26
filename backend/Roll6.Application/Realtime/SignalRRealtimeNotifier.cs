using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;

namespace Roll6.Application.Realtime;

/// <summary>Sends table events to the campaign group through the SignalR hub (017); failures are only logged.</summary>
public class SignalRRealtimeNotifier : IRealtimeNotifier
{
    private readonly IHubContext<TableHub> _hub;
    private readonly TableConnections _connections;
    private readonly ILogger<SignalRRealtimeNotifier> _logger;

    public SignalRRealtimeNotifier(IHubContext<TableHub> hub, TableConnections connections, ILogger<SignalRRealtimeNotifier> logger)
    {
        _hub = hub;
        _connections = connections;
        _logger = logger;
    }

    public async Task PublishAsync(TableEventInfo tableEvent)
    {
        try
        {
            await _hub.Clients.Group(TableConnections.GroupName(tableEvent.CampaignId))
                .SendAsync(TableHub.EVENT_METHOD, tableEvent);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not publish {Type} to campaign {CampaignId}", tableEvent.Type, tableEvent.CampaignId);
        }
    }

    public async Task RemoveUserFromCampaignAsync(long userId, long campaignId)
    {
        try
        {
            foreach (var connectionId in _connections.ConnectionsOf(userId, campaignId))
            {
                _connections.SetCampaign(connectionId, userId, null);
                await _hub.Groups.RemoveFromGroupAsync(connectionId, TableConnections.GroupName(campaignId));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not remove user {UserId} from campaign {CampaignId}", userId, campaignId);
        }
    }
}
