using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.CampaignNpc;

namespace Roll6.API.Controllers;

/// <summary>NPCs available in a campaign (master only); the list is <c>GET /api/campaign/{id}/npc</c>.</summary>
[Authorize]
public class CampaignNpcController : ApiControllerBase
{
    private readonly ICampaignNpcService _service;

    public CampaignNpcController(ICampaignNpcService service)
    {
        _service = service;
    }

    [HttpPost]
    [ProducesResponseType(typeof(CampaignNpcInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Add([FromBody] CampaignNpcInsertInfo info)
    {
        try
        {
            var campaignNpc = await _service.AddAsync(CurrentUserId, info);
            return Created($"/api/campaign/{campaignNpc.CampaignId}/npc", campaignNpc);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Category (Inimigo/Neutro/Aliado) and, for allies, the master character of the NPC in the campaign (071).</summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(CampaignNpcInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] CampaignNpcUpdateInfo info)
    {
        try
        {
            return Ok(await _service.UpdateAsync(CurrentUserId, id, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Removes the NPC from the campaign and its occurrences from the campaign's maps.</summary>
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
}
