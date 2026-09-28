using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Campaign;
using Roll6.DTO.CampaignCharacter;
using Roll6.DTO.CampaignNpc;
using Roll6.DTO.CampaignPlan;
using Roll6.DTO.Common;
using Roll6.DTO.Map;
using Roll6.DTO.Turn;

namespace Roll6.API.Controllers;

[Authorize]
public class CampaignController : ApiControllerBase
{
    private readonly ICampaignService _campaignService;
    private readonly IMapService _mapService;
    private readonly ICampaignCharacterService _campaignCharacterService;
    private readonly ICampaignNpcService _campaignNpcService;
    private readonly ITurnService _turnService;
    private readonly ICampaignPlanService _campaignPlanService;

    public CampaignController(
        ICampaignService campaignService,
        IMapService mapService,
        ICampaignCharacterService campaignCharacterService,
        ICampaignNpcService campaignNpcService,
        ITurnService turnService,
        ICampaignPlanService campaignPlanService)
    {
        _campaignPlanService = campaignPlanService;
        _turnService = turnService;
        _campaignService = campaignService;
        _mapService = mapService;
        _campaignCharacterService = campaignCharacterService;
        _campaignNpcService = campaignNpcService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedList<CampaignInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] PageQuery query, [FromQuery] bool mine = false)
    {
        try
        {
            return Ok(await _campaignService.ListAsync(query, mine ? CurrentUserId : null));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(CampaignInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(long id)
    {
        try
        {
            return Ok(await _campaignService.GetByIdAsync(id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(CampaignInfo), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CampaignInsertInfo info)
    {
        try
        {
            var campaign = await _campaignService.CreateAsync(CurrentUserId, info);
            return CreatedAtAction(nameof(GetById), new { id = campaign.CampaignId }, campaign);
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}/name")]
    [ProducesResponseType(typeof(CampaignInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> Rename(long id, [FromBody] CampaignInsertInfo info)
    {
        try
        {
            return Ok(await _campaignService.RenameAsync(CurrentUserId, id, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpPut("{id:long}/open")]
    [ProducesResponseType(typeof(CampaignInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetOpen(long id, [FromBody] CampaignOpenInfo info)
    {
        try
        {
            return Ok(await _campaignService.SetOpenAsync(CurrentUserId, id, info));
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
            await _campaignService.DeleteAsync(CurrentUserId, id);
            return NoContent();
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}/map")]
    [ProducesResponseType(typeof(PagedList<MapInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListMaps(long id, [FromQuery] PageQuery query)
    {
        try
        {
            return Ok(await _mapService.ListByCampaignAsync(CurrentUserId, id, query));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Current turn and its entries (master or approved participants).</summary>
    [HttpGet("{id:long}/turn")]
    [ProducesResponseType(typeof(TurnStateInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTurn(long id)
    {
        try
        {
            return Ok(await _turnService.GetStateAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Readable markdown of a turn (024); without turnNo, the turn in progress.</summary>
    [HttpGet("{id:long}/turn/summary")]
    [ProducesResponseType(typeof(TurnSummaryInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTurnSummary(long id, [FromQuery] int? turnNo)
    {
        try
        {
            return Ok(await _turnService.GetSummaryAsync(CurrentUserId, id, turnNo));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>The whole table for an AI assistant (027); without turnNo, the turn in progress.</summary>
    [HttpGet("{id:long}/turn/data")]
    [ProducesResponseType(typeof(TurnDataInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTurnData(long id, [FromQuery] int? turnNo)
    {
        try
        {
            return Ok(await _turnService.GetDataAsync(CurrentUserId, id, turnNo));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Saves the result of the turn (characters, NPCs, narration) at once and finishes it (027, master only).</summary>
    [HttpPost("{id:long}/turn/process")]
    [ProducesResponseType(typeof(TurnProcessResultInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> ProcessTurn(long id, [FromBody] TurnProcessInfo info)
    {
        try
        {
            return Ok(await _turnService.ProcessAsync(CurrentUserId, id, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Finished turns, newest first, paged by turn number (028: turn console).</summary>
    [HttpGet("{id:long}/turn/history")]
    [ProducesResponseType(typeof(TurnHistoryPageInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTurnHistory(long id, [FromQuery] int? before, [FromQuery] int? limit)
    {
        try
        {
            return Ok(await _turnService.GetHistoryAsync(CurrentUserId, id, before, limit));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Entries of a turn, oldest first (turn summary).</summary>
    [HttpGet("{id:long}/turn/{turnNo:int}")]
    [ProducesResponseType(typeof(List<TurnInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListTurn(long id, int turnNo)
    {
        try
        {
            return Ok(await _turnService.ListAsync(CurrentUserId, id, turnNo));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Plan entries of the campaign, without descriptions (master only, 018).</summary>
    [HttpGet("{id:long}/plan")]
    [ProducesResponseType(typeof(List<CampaignPlanInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPlans(long id)
    {
        try
        {
            return Ok(await _campaignPlanService.ListAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Master: sets the map the players follow (017); null clears it.</summary>
    [HttpPut("{id:long}/current-map")]
    [ProducesResponseType(typeof(CampaignInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetCurrentMap(long id, [FromBody] CampaignCurrentMapInfo info)
    {
        try
        {
            return Ok(await _campaignService.SetCurrentMapAsync(CurrentUserId, id, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>Finishes the current turn (master); lists who hasn't acted unless forced.</summary>
    [HttpPost("{id:long}/turn/finish")]
    [ProducesResponseType(typeof(TurnFinishResultInfo), StatusCodes.Status200OK)]
    public async Task<IActionResult> FinishTurn(long id, [FromBody] TurnFinishInfo info)
    {
        try
        {
            return Ok(await _turnService.FinishAsync(CurrentUserId, id, info));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    [HttpGet("{id:long}/character")]
    [ProducesResponseType(typeof(List<CampaignCharacterInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListCharacters(long id)
    {
        try
        {
            return Ok(await _campaignCharacterService.ListByCampaignAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }

    /// <summary>NPCs available in the campaign (master and approved participants).</summary>
    [HttpGet("{id:long}/npc")]
    [ProducesResponseType(typeof(List<CampaignNpcInfo>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListNpcs(long id)
    {
        try
        {
            return Ok(await _campaignNpcService.ListByCampaignAsync(CurrentUserId, id));
        }
        catch (Exception ex)
        {
            return HandleException(ex);
        }
    }
}
