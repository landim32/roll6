using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Application.Auth;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Push;

namespace Roll6.API.Controllers;

/// <summary>
/// Web Push notifications (043): the VAPID key, this device's subscription (login session only — a browser thing, not
/// for API keys) and the campaigns' mute choices.
/// </summary>
[Authorize]
public class PushController : ApiControllerBase
{
    private readonly IPushService _pushService;

    public PushController(IPushService pushService)
    {
        _pushService = pushService;
    }

    [HttpGet("key")]
    [ProducesResponseType(typeof(PushKeyInfo), StatusCodes.Status200OK)]
    public IActionResult Key()
    {
        try
        {
            return Ok(_pushService.GetKey());
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost("subscription")]
    [Authorize(Policy = AuthConstants.SESSION_POLICY)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscriptionInfo info)
    {
        try
        {
            await _pushService.SubscribeAsync(CurrentUserId, info);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpDelete("subscription")]
    [Authorize(Policy = AuthConstants.SESSION_POLICY)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Unsubscribe([FromBody] PushUnsubscribeInfo info)
    {
        try
        {
            await _pushService.UnsubscribeAsync(CurrentUserId, info);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>The campaigns of the user's table and whether each one's notifications are muted.</summary>
    [HttpGet("campaigns")]
    [ProducesResponseType(typeof(List<CampaignNotificationInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Campaigns()
    {
        try
        {
            return Ok(await _pushService.ListCampaignsAsync(CurrentUserId));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
