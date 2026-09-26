using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Turn;

namespace Roll6.API.Controllers;

/// <summary>Turn entries (016): actions and resets from the map; direct entries by the master.</summary>
[Authorize]
public class TurnController : ApiControllerBase
{
    private readonly ITurnService _service;

    public TurnController(ITurnService service)
    {
        _service = service;
    }

    /// <summary>"Agir": action of the piece's character (owner or master) or NPC occurrence (master).</summary>
    [HttpPost("action")]
    [ProducesResponseType(typeof(TurnInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Act([FromBody] TurnActInfo info)
    {
        try
        {
            var turn = await _service.ActAsync(CurrentUserId, info);
            return Created($"/api/campaign/{turn.CampaignId}/turn", turn);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>"Resetar turno": removes the piece's entries of the current turn and undoes its move.</summary>
    [HttpPost("reset")]
    [ProducesResponseType(typeof(TurnResetResultInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Reset([FromBody] TurnPieceInfo info)
    {
        try
        {
            return Ok(await _service.ResetAsync(CurrentUserId, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Direct entry (master only) — the only way to record an action result.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(TurnInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] TurnInsertInfo info)
    {
        try
        {
            var turn = await _service.CreateAsync(CurrentUserId, info);
            return Created($"/api/campaign/{turn.CampaignId}/turn/{turn.TurnNo}", turn);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            await _service.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
