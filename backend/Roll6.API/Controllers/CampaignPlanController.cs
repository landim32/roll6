using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.CampaignPlan;

namespace Roll6.API.Controllers;

/// <summary>Campaign plan entries (018): only the campaign master. The list is at GET /api/campaign/{id}/plan.</summary>
[Authorize]
public class CampaignPlanController : ApiControllerBase
{
    private readonly ICampaignPlanService _campaignPlanService;

    public CampaignPlanController(ICampaignPlanService campaignPlanService)
    {
        _campaignPlanService = campaignPlanService;
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(CampaignPlanDetailInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _campaignPlanService.GetByIdAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(CampaignPlanDetailInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CampaignPlanInsertInfo info)
    {
        try
        {
            var plan = await _campaignPlanService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = plan.CampaignPlanId }, plan);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(CampaignPlanDetailInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(long id, [FromBody] CampaignPlanUpdateInfo info)
    {
        try
        {
            return Ok(await _campaignPlanService.UpdateAsync(CurrentUserId, id, info));
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
            await _campaignPlanService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
