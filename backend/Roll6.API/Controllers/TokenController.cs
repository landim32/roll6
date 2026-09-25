using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Common;
using Roll6.DTO.Token;

namespace Roll6.API.Controllers;

[Authorize]
public class TokenController : ApiControllerBase
{
    private readonly ITokenLibraryService _tokenService;

    public TokenController(ITokenLibraryService tokenService)
    {
        _tokenService = tokenService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedList<TokenInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] PageQuery query)
    {
        try
        {
            return Ok(await _tokenService.ListAsync(query));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(TokenInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _tokenService.GetByIdAsync(id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(TokenInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] TokenInsertInfo info)
    {
        try
        {
            var token = await _tokenService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = token.TokenId }, token);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(TokenInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] TokenInsertInfo info)
    {
        try
        {
            return Ok(await _tokenService.UpdateAsync(CurrentUserId, id, info));
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
            await _tokenService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
