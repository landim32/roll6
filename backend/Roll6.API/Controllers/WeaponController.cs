using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Common;
using Roll6.DTO.Weapon;

namespace Roll6.API.Controllers;

/// <summary>
/// The weapon library (082): 3D models (.glb, uploaded through <c>POST /api/model</c>) that tokens hold in a hand.
/// Shared like tokens; only the owner renames, replaces the file or deletes, and a weapon in use cannot be deleted.
/// </summary>
[Authorize]
public class WeaponController : ApiControllerBase
{
    private readonly IWeaponService _weaponService;

    public WeaponController(IWeaponService weaponService)
    {
        _weaponService = weaponService;
    }

    /// <summary>The library; <c>mine=true</c> lists only the logged user's weapons, <c>search</c> filters by name.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedList<WeaponInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] PageQuery query, [FromQuery] bool mine = false)
    {
        try
        {
            return Ok(await _weaponService.ListAsync(CurrentUserId, query, mine));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(WeaponInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _weaponService.GetByIdAsync(id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(WeaponInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] WeaponInsertInfo info)
    {
        try
        {
            var weapon = await _weaponService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = weapon.WeaponId }, weapon);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Changes name and/or file (owner only); a field left out keeps its value.</summary>
    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(WeaponInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] WeaponUpdateInfo info)
    {
        try
        {
            return Ok(await _weaponService.UpdateAsync(CurrentUserId, id, info));
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
            await _weaponService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
