using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Roll6.Application.Auth;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Realtime;

namespace Roll6.Application.Realtime;

/// <summary>
/// Real-time table channel (017): a connection joins the group of the campaign it is looking at and receives its
/// <c>tableEvent</c>s. Every stored change still goes through the REST API; the one thing a client sends here is the
/// transient stream of its free-mode walk (069, <see cref="Walk"/>), relayed to the others and never stored. Needs a
/// login session: API keys (019) are for the REST API only.
/// </summary>
[Authorize(Policy = AuthConstants.SESSION_POLICY)]
public class TableHub : Hub
{
    /// <summary>Client method that receives the events.</summary>
    public const string EVENT_METHOD = "tableEvent";

    /// <summary>Personal notice shown as a toast (043).</summary>
    public const string NOTICE_METHOD = "notice";

    /// <summary>The bell has a new notice (no data: the client reloads its inbox).</summary>
    public const string INBOX_METHOD = "inbox";

    /// <summary>Another participant's walk sample (069).</summary>
    public const string WALK_METHOD = "walk";

    /// <summary>How long a positive walk check is reused before asking again (069).</summary>
    public static readonly TimeSpan WALK_PERMISSION_TTL = TimeSpan.FromSeconds(10);

    private readonly ICampaignService _campaignService;
    private readonly IMapTokenService _mapTokenService;
    private readonly TableConnections _connections;
    private readonly TimeProvider _time;

    public TableHub(ICampaignService campaignService, IMapTokenService mapTokenService, TableConnections connections, TimeProvider time)
    {
        _campaignService = campaignService;
        _mapTokenService = mapTokenService;
        _connections = connections;
        _time = time;
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

    /// <summary>
    /// The client reports whether its window is on screen and the chat visible (043): people looking at the chat get no
    /// push for its messages, and personal notices of the campaign on screen become toasts.
    /// </summary>
    public Task SetPresence(bool visible, bool chatVisible)
    {
        _connections.SetPresence(Context.ConnectionId, visible, chatVisible);
        return Task.CompletedTask;
    }

    /// <summary>
    /// One sample of the caller's free-mode walk (069): relayed as <c>walk</c> to the other connections of the campaign it
    /// follows, never stored. Dropped silently when the connection follows no campaign, a value is not a number or the
    /// caller may not walk that piece (<see cref="IMapTokenService.CanWalkAsync"/>, remembered for 10 s).
    /// </summary>
    public async Task Walk(WalkInfo info)
    {
        if (info == null || !double.IsFinite(info.X) || !double.IsFinite(info.Z) || !double.IsFinite(info.Yaw))
            return;
        if (_connections.CampaignOf(Context.ConnectionId) is not long campaignId)
            return;
        var userId = UserId;
        var now = _time.GetUtcNow().UtcDateTime;
        if (!_connections.IsWalkAllowed(Context.ConnectionId, info.MapTokenId, now))
        {
            if (!await _mapTokenService.CanWalkAsync(userId, info.MapTokenId, campaignId))
                return;
            _connections.AllowWalk(Context.ConnectionId, info.MapTokenId, now + WALK_PERMISSION_TTL);
        }
        await Clients.OthersInGroup(TableConnections.GroupName(campaignId)).SendAsync(WALK_METHOD, new WalkMessageInfo
        {
            CampaignId = campaignId,
            UserId = userId,
            MapTokenId = info.MapTokenId,
            X = info.X,
            Z = info.Z,
            Yaw = info.Yaw,
            Moving = info.Moving
        });
    }

    /// <summary>Stops following any campaign.</summary>
    public async Task LeaveCampaign()
    {
        var previous = _connections.SetCampaign(Context.ConnectionId, UserId, null);
        if (previous is long old)
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, TableConnections.GroupName(old));
    }
}
