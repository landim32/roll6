using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.MapNpc;

namespace Roll6.API.Controllers;

/// <summary>NPC occurrences on campaign maps (master only); the list is <c>GET /api/map/{id}/npc</c>.</summary>
[Authorize]
public class MapNpcController : ApiControllerBase
{
    private readonly IMapNpcService _service;

    public MapNpcController(IMapNpcService service)
    {
        _service = service;
    }

    /// <summary>Creates the occurrence and its piece on a free hex.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(MapNpcInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] MapNpcInsertInfo info)
    {
        try
        {
            var mapNpc = await _service.CreateAsync(CurrentUserId, info);
            return Created($"/api/map/{mapNpc.MapId}/npc", mapNpc);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(MapNpcInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] MapNpcUpdateInfo info)
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

    /// <summary>Removes the occurrence and its piece.</summary>
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
