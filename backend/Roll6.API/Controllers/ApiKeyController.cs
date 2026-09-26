using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Application.Auth;
using Roll6.Domain.Interfaces;
using Roll6.DTO.ApiKey;

namespace Roll6.API.Controllers;

/// <summary>The logged user's API keys (019). Requires a login session: API keys can't manage keys.</summary>
[Authorize(Policy = AuthConstants.SESSION_POLICY)]
public class ApiKeyController : ApiControllerBase
{
    private readonly IApiKeyService _apiKeyService;

    public ApiKeyController(IApiKeyService apiKeyService)
    {
        _apiKeyService = apiKeyService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<ApiKeyInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List()
    {
        try
        {
            return Ok(await _apiKeyService.ListAsync(CurrentUserId));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Creates a key; the response is the only time the full key is returned.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiKeyCreatedInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] ApiKeyInsertInfo info)
    {
        try
        {
            var created = await _apiKeyService.CreateAsync(CurrentUserId, info);
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost("{id:long}/revoke")]
    [ProducesResponseType(typeof(ApiKeyInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Revoke(long id)
    {
        try
        {
            return Ok(await _apiKeyService.RevokeAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Deletes a revoked or expired key (an active one must be revoked first).</summary>
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            await _apiKeyService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
