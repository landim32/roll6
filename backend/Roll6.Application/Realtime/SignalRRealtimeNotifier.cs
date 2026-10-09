using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Roll6.Application.Notifications;
using Roll6.Domain.Models;
using Roll6.DTO.Push;
using Roll6.Domain.Realtime;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Application.Realtime;

/// <summary>
/// Sends table events to the campaign group through the SignalR hub (017); failures are only logged. Piece events of a
/// map that isn't the campaign's current one go only to the master's connections (039, <see cref="TableEventAudience"/>).
/// </summary>
public class SignalRRealtimeNotifier : IRealtimeNotifier, INoticeChannel
{
    private readonly IHubContext<TableHub> _hub;
    private readonly TableConnections _connections;
    private readonly ILogger<SignalRRealtimeNotifier> _logger;
    private readonly IServiceScopeFactory _scopes;

    public SignalRRealtimeNotifier(IHubContext<TableHub> hub, TableConnections connections, ILogger<SignalRRealtimeNotifier> logger,
        IServiceScopeFactory scopes)
    {
        _hub = hub;
        _connections = connections;
        _logger = logger;
        _scopes = scopes;
    }

    public async Task PublishAsync(TableEventInfo tableEvent)
    {
        try
        {
            if (TableEventAudience.NeedsCampaign(tableEvent.Type, tableEvent.MapId))
            {
                // This singleton reads the campaign in a scope of its own (the repository is scoped).
                using var scope = _scopes.CreateScope();
                var campaign = await scope.ServiceProvider.GetRequiredService<ICampaignRepository<Campaign>>()
                    .GetByIdAsync(tableEvent.CampaignId);
                if (campaign == null)
                {
                    _logger.LogWarning("Campaign {CampaignId} not found for {Type}", tableEvent.CampaignId, tableEvent.Type);
                    return;
                }
                if (TableEventAudience.For(tableEvent, campaign.CurrentMapId) == TableEventAudienceKind.MasterOnly)
                {
                    var masterConnections = _connections.ConnectionsOf(campaign.UserId, tableEvent.CampaignId);
                    if (masterConnections.Count > 0)
                        await _hub.Clients.Clients(masterConnections).SendAsync(TableHub.EVENT_METHOD, tableEvent);
                    return;
                }
            }
            await _hub.Clients.Group(TableConnections.GroupName(tableEvent.CampaignId))
                .SendAsync(TableHub.EVENT_METHOD, tableEvent);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not publish {Type} to campaign {CampaignId}", tableEvent.Type, tableEvent.CampaignId);
        }
    }

    public async Task SendNoticeAsync(long userId, long campaignId, NoticeInfo notice)
    {
        try
        {
            var connections = _connections.ConnectionsOf(userId, campaignId);
            if (connections.Count > 0)
                await _hub.Clients.Clients(connections).SendAsync(TableHub.NOTICE_METHOD, notice);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send a {Kind} notice to user {UserId}", notice.Kind, userId);
        }
    }

    public async Task InboxChangedAsync(long userId)
    {
        try
        {
            var connections = _connections.ConnectionsOfUser(userId);
            if (connections.Count > 0)
                await _hub.Clients.Clients(connections).SendAsync(TableHub.INBOX_METHOD);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not tell user {UserId} about a new notice", userId);
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
