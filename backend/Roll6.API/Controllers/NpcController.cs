using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Common;
using Roll6.DTO.Npc;

namespace Roll6.API.Controllers;

/// <summary>The logged user's NPC library (each NPC is read and changed only by its owner).</summary>
[Authorize]
public class NpcController : ApiControllerBase
{
    private readonly INpcService _npcService;

    public NpcController(INpcService npcService)
    {
        _npcService = npcService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedList<NpcInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] PageQuery query)
    {
        try
        {
            return Ok(await _npcService.ListAsync(CurrentUserId, query));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(NpcInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _npcService.GetByIdAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(NpcInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] NpcInsertInfo info)
    {
        try
        {
            var npc = await _npcService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = npc.NpcId }, npc);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(NpcInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] NpcInsertInfo info)
    {
        try
        {
            return Ok(await _npcService.UpdateAsync(CurrentUserId, id, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Refused (409) while the NPC is in some campaign.</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            await _npcService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
