using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.DTO.Common;
using SimpleTabletopMap.DTO.MapModel;

namespace SimpleTabletopMap.API.Controllers;

[Authorize]
public class MapModelController : ApiControllerBase
{
    private readonly IMapModelService _mapModelService;

    public MapModelController(IMapModelService mapModelService)
    {
        _mapModelService = mapModelService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedList<MapModelInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] PageQuery query, [FromQuery] bool mine = false)
    {
        try
        {
            return Ok(await _mapModelService.ListAsync(query, mine ? CurrentUserId : null));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(MapModelInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _mapModelService.GetByIdAsync(id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(MapModelInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] MapModelInsertInfo info)
    {
        try
        {
            var mapModel = await _mapModelService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = mapModel.MapModelId }, mapModel);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(MapModelInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] MapModelInsertInfo info)
    {
        try
        {
            return Ok(await _mapModelService.UpdateAsync(CurrentUserId, id, info));
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
            await _mapModelService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
