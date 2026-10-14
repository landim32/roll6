using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Animation;
using Roll6.DTO.Common;

namespace Roll6.API.Controllers;

/// <summary>
/// The animation library (059): <c>roll6-animation</c> JSON files moving a Mixamo skeleton, shared like tokens and
/// chosen for a token's animation states as <c>animation:{id}</c>. Only the owner renames, retypes, replaces the content
/// or deletes.
/// </summary>
[Authorize]
public class AnimationController : ApiControllerBase
{
    private readonly IAnimationService _animationService;

    public AnimationController(IAnimationService animationService)
    {
        _animationService = animationService;
    }

    /// <summary>The library; <c>mine=true</c> lists only the logged user's animations, <c>type</c> (1–7) one type.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedList<AnimationInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] PageQuery query, [FromQuery] bool mine = false, [FromQuery] int? type = null)
    {
        try
        {
            return Ok(await _animationService.ListAsync(CurrentUserId, query, mine, type));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(AnimationInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _animationService.GetByIdAsync(id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>
    /// The animation file, served by the API (the bucket sends no CORS headers and its URLs expire). The owner may replace
    /// the content under the same id, so browsers revalidate it; <c>nosniff</c> keeps them from reading it as anything but
    /// JSON.
    /// </summary>
    [HttpGet("{id:long}/file")]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetFile(long id)
    {
        try
        {
            var file = await _animationService.OpenFileAsync(id);
            Response.Headers.CacheControl = "private, no-cache";
            Response.Headers.XContentTypeOptions = "nosniff";
            return File(file.Content, "application/json");
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [RequestSizeLimit(1_100_000)]
    [ProducesResponseType(typeof(AnimationInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] AnimationInsertInfo info)
    {
        try
        {
            var animation = await _animationService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = animation.AnimationId }, animation);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(AnimationInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] AnimationUpdateInfo info)
    {
        try
        {
            return Ok(await _animationService.UpdateAsync(CurrentUserId, id, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Replaces the animation's file with a new <c>roll6-animation</c> content (owner only).</summary>
    [HttpPut("{id:long}/content")]
    [RequestSizeLimit(1_100_000)]
    [ProducesResponseType(typeof(AnimationInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> ReplaceContent(long id, [FromBody] AnimationContentInfo info)
    {
        try
        {
            return Ok(await _animationService.ReplaceContentAsync(CurrentUserId, id, info));
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
            await _animationService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
