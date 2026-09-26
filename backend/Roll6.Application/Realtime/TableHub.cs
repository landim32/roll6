using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Roll6.Application.Auth;
using Roll6.Domain.Interfaces;

namespace Roll6.Application.Realtime;

/// <summary>
/// Real-time table channel (017), server → client only: a connection joins the group of the campaign it is
/// looking at and receives its <c>tableEvent</c>s. Every change still goes through the REST API. Needs a login
/// session: API keys (019) are for the REST API only.
/// </summary>
[Authorize(Policy = AuthConstants.SESSION_POLICY)]
public class TableHub : Hub
{
    /// <summary>Client method that receives the events.</summary>
    public const string EVENT_METHOD = "tableEvent";

    private readonly ICampaignService _campaignService;
    private readonly TableConnections _connections;

    public TableHub(ICampaignService campaignService, TableConnections connections)
    {
        _campaignService = campaignService;
        _connections = connections;
    }

    private long UserId
    {
        get
        {
            var value = Context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub)
                        ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(value, out var userId) ? userId : throw new HubException("unauthorized");
        }
    }

    public override Task OnConnectedAsync()
    {
        _connections.Add(Context.ConnectionId, UserId);
        return base.OnConnectedAsync();
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        _connections.Remove(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }

    /// <summary>Follows the campaign (master or approved participant only), leaving the previous one.</summary>
    public async Task<bool> JoinCampaign(long campaignId)
    {
        var userId = UserId;
        bool allowed;
        try
        {
            allowed = await _campaignService.CanReadAsync(userId, campaignId);
        }
        catch (KeyNotFoundException)
        {
            throw new HubException("not-found");
        }
        if (!allowed)
            throw new HubException("forbidden");

        var previous = _connections.SetCampaign(Context.ConnectionId, userId, campaignId);
        if (previous is long old && old != campaignId)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, TableConnections.GroupName(old));
        await Groups.AddToGroupAsync(Context.ConnectionId, TableConnections.GroupName(campaignId));
        return true;
    }

    /// <summary>Stops following any campaign.</summary>
    public async Task LeaveCampaign()
    {
        var previous = _connections.SetCampaign(Context.ConnectionId, UserId, null);
        if (previous is long old)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, TableConnections.GroupName(old));
    }
}
