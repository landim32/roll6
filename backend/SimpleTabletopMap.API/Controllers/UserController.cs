using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.DTO.User;

namespace SimpleTabletopMap.API.Controllers;

[Authorize]
public class UserController : ApiControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(UserInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Register([FromBody] UserInsertInfo info)
    {
        try
        {
            var user = await _userService.RegisterAsync(info);
            return CreatedAtAction(nameof(GetMe), null, user);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(UserTokenInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Login([FromBody] UserLoginInfo info)
    {
        try
        {
            var result = await _userService.LoginAsync(info);
            if (result == null)
                return Problem(detail: "E-mail ou senha inválidos.", statusCode: StatusCodes.Status401Unauthorized);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(UserInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMe()
    {
        try
        {
            return Ok(await _userService.GetMeAsync(CurrentUserId));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("name")]
    [ProducesResponseType(typeof(UserInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Rename([FromBody] UserNameInfo info)
    {
        try
        {
            return Ok(await _userService.RenameAsync(CurrentUserId, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ChangePassword([FromBody] UserPasswordInfo info)
    {
        try
        {
            await _userService.ChangePasswordAsync(CurrentUserId, info);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
