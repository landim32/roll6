using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Campaign;
using Roll6.DTO.CampaignCharacter;
using Roll6.DTO.CampaignNpc;
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

    public CampaignController(
        ICampaignService campaignService,
        IMapService mapService,
        ICampaignCharacterService campaignCharacterService,
        ICampaignNpcService campaignNpcService,
        ITurnService turnService)
    {
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

    /// <summary>NPCs available in the campaign (master only).</summary>
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
