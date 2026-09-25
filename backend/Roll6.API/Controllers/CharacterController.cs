using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Character;
using Roll6.DTO.Common;

namespace Roll6.API.Controllers;

[Authorize]
public class CharacterController : ApiControllerBase
{
    private readonly ICharacterService _characterService;

    public CharacterController(ICharacterService characterService)
    {
        _characterService = characterService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<CharacterInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List()
    {
        try
        {
            return Ok(await _characterService.ListAsync(CurrentUserId));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("search")]
    [ProducesResponseType(typeof(PagedList<CharacterSearchInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search([FromQuery] PageQuery query)
    {
        try
        {
            return Ok(await _characterService.SearchAsync(query));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(CharacterInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _characterService.GetByIdAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(CharacterInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CharacterInsertInfo info)
    {
        try
        {
            var character = await _characterService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = character.CharacterId }, character);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(CharacterInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] CharacterInsertInfo info)
    {
        try
        {
            return Ok(await _characterService.UpdateAsync(CurrentUserId, id, info));
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
            await _characterService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
