using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Map;
using Roll6.DTO.MapNpc;
using Roll6.DTO.MapToken;

namespace Roll6.API.Controllers;

[Authorize]
public class MapController : ApiControllerBase
{
    private readonly IMapService _mapService;
    private readonly IMapTokenService _mapTokenService;
    private readonly IMapNpcService _mapNpcService;

    public MapController(IMapService mapService, IMapTokenService mapTokenService, IMapNpcService mapNpcService)
    {
        _mapService = mapService;
        _mapTokenService = mapTokenService;
        _mapNpcService = mapNpcService;
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(MapInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _mapService.GetByIdAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(MapInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] MapInsertInfo info)
    {
        try
        {
            var map = await _mapService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = map.MapId }, map);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(MapInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] MapUpdateInfo info)
    {
        try
        {
            return Ok(await _mapService.UpdateAsync(CurrentUserId, id, info));
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
            await _mapService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}/token")]
    [ProducesResponseType(typeof(List<MapTokenInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListTokens(long id)
    {
        try
        {
            return Ok(await _mapTokenService.ListByMapAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>NPC occurrences on the map (master or approved participants).</summary>
    [HttpGet("{id:long}/npc")]
    [ProducesResponseType(typeof(List<MapNpcInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListNpcs(long id)
    {
        try
        {
            return Ok(await _mapNpcService.ListByMapAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
