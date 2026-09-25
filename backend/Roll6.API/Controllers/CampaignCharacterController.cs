using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.CampaignCharacter;

namespace Roll6.API.Controllers;

/// <summary>Character participation in campaigns: invites (master) and access requests (character owner).</summary>
[Authorize]
public class CampaignCharacterController : ApiControllerBase
{
    private readonly ICampaignCharacterService _service;

    public CampaignCharacterController(ICampaignCharacterService service)
    {
        _service = service;
    }

    [HttpPost("request")]
    [ProducesResponseType(typeof(CampaignCharacterInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> RequestAccess([FromBody] CampaignCharacterRequestInfo info)
    {
        try
        {
            var participation = await _service.RequestAccessAsync(CurrentUserId, info);
            return Created($"/api/campaign/{participation.CampaignId}/character", participation);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost("invite")]
    [ProducesResponseType(typeof(CampaignCharacterInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Invite([FromBody] CampaignCharacterRequestInfo info)
    {
        try
        {
            var participation = await _service.InviteAsync(CurrentUserId, info);
            return Created($"/api/campaign/{participation.CampaignId}/character", participation);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("invites")]
    [ProducesResponseType(typeof(List<CampaignCharacterInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListInvites()
    {
        try
        {
            return Ok(await _service.ListInvitesAsync(CurrentUserId));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost("{id:long}/accept")]
    [ProducesResponseType(typeof(CampaignCharacterInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> AcceptInvite(long id)
    {
        try
        {
            return Ok(await _service.AcceptInviteAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost("{id:long}/decline")]
    [ProducesResponseType(typeof(CampaignCharacterInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeclineInvite(long id)
    {
        try
        {
            return Ok(await _service.DeclineInviteAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost("{id:long}/approve")]
    [ProducesResponseType(typeof(CampaignCharacterInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> ApproveRequest(long id)
    {
        try
        {
            return Ok(await _service.ApproveRequestAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost("{id:long}/deny")]
    [ProducesResponseType(typeof(CampaignCharacterInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> DenyRequest(long id)
    {
        try
        {
            return Ok(await _service.DenyRequestAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("mine")]
    [ProducesResponseType(typeof(List<CampaignCharacterInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListMine([FromQuery] long campaignId)
    {
        try
        {
            return Ok(await _service.ListMineAsync(CurrentUserId, campaignId));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Removes the character from the campaign (the character itself is kept). Master only.</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remove(long id)
    {
        try
        {
            await _service.RemoveAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Current life/energy in the campaign (character owner or campaign master).</summary>
    [HttpPut("{id:long}/vitals")]
    [ProducesResponseType(typeof(CampaignCharacterInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateVitals(long id, [FromBody] CampaignCharacterVitalsInfo info)
    {
        try
        {
            return Ok(await _service.UpdateVitalsAsync(CurrentUserId, id, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
