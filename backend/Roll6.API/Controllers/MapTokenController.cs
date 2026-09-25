using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.MapToken;

namespace Roll6.API.Controllers;

[Authorize]
public class MapTokenController : ApiControllerBase
{
    private readonly IMapTokenService _mapTokenService;

    public MapTokenController(IMapTokenService mapTokenService)
    {
        _mapTokenService = mapTokenService;
    }

    [HttpPost]
    [ProducesResponseType(typeof(MapTokenInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] MapTokenInsertInfo info)
    {
        try
        {
            var mapToken = await _mapTokenService.CreateAsync(CurrentUserId, info);
            return Created($"/api/map/{mapToken.MapId}/token", mapToken);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(MapTokenInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] MapTokenUpdateInfo info)
    {
        try
        {
            return Ok(await _mapTokenService.UpdateAsync(CurrentUserId, id, info));
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
            await _mapTokenService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
