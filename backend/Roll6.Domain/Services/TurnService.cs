using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Turn;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// Campaign turns (016). Everyone at the table reads the turn; players act and reset only their own approved
/// characters; the master acts for any character or NPC occurrence, writes entries directly (action results
/// only this way) and finishes the turn.
/// </summary>
public class TurnService : ITurnService
{
    private readonly ITurnRepository<Turn> _repository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly ICharacterRepository<Character> _characterRepository;
    private readonly IMapNpcRepository<MapNpc> _mapNpcRepository;
    private readonly INpcRepository<Npc> _npcRepository;
    private readonly IUnitOfWork _unitOfWork;

    public TurnService(
        ITurnRepository<Turn> repository,
        ICampaignRepository<Campaign> campaignRepository,
        IMapRepository<Map> mapRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        ICharacterRepository<Character> characterRepository,
        IMapNpcRepository<MapNpc> mapNpcRepository,
        INpcRepository<Npc> npcRepository,
        IUnitOfWork unitOfWork)
    {
        _repository = repository;
        _campaignRepository = campaignRepository;
        _mapRepository = mapRepository;
        _mapTokenRepository = mapTokenRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _characterRepository = characterRepository;
        _mapNpcRepository = mapNpcRepository;
        _npcRepository = npcRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<TurnStateInfo> GetStateAsync(long userId, long campaignId)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        return new TurnStateInfo
        {
            TurnNo = campaign.CurrentTurn,
            Entries = await MapToDtoAsync(await _repository.ListByCampaignTurnAsync(campaignId, campaign.CurrentTurn))
        };
    }

    public async Task<List<TurnInfo>> ListAsync(long userId, long campaignId, int turnNo)
    {
        await GetReadableCampaignAsync(userId, campaignId);
        return await MapToDtoAsync(await _repository.ListByCampaignTurnAsync(campaignId, turnNo));
    }

    public async Task<TurnInfo> ActAsync(long userId, TurnActInfo info)
    {
        var (piece, map, campaign) = await GetPieceAsync(info.MapTokenId);
        var actor = await ResolveActorAsync(userId, piece, campaign);
        var turn = Turn.Action(campaign.CampaignId, map.MapId, actor.CharacterId, actor.NpcId, actor.MapNpcId,
            campaign.CurrentTurn, info.Description);
        return (await MapToDtoAsync(new List<Turn> { await _repository.InsertAsync(turn) })).Single();
    }

    /// <summary>Removes the piece's entries of the current turn and undoes its move when the former hex is free.</summary>
    public async Task<TurnResetResultInfo> ResetAsync(long userId, TurnPieceInfo info)
    {
        var (piece, map, campaign) = await GetPieceAsync(info.MapTokenId);
        var actor = await ResolveActorAsync(userId, piece, campaign);
        var entries = await _repository.ListByActorTurnAsync(campaign.CampaignId, campaign.CurrentTurn, actor.CharacterId, actor.MapNpcId);
        var movement = entries.FirstOrDefault(e => e.TurnType == TurnType.Movement);

        var reverted = false;
        if (movement is { BeforeX: int x, BeforeY: int y, BeforeLook: int look } && movement.MapId == map.MapId)
            reverted = !await _mapTokenRepository.ExistsAtAsync(map.MapId, x, y, piece.MapTokenId);

        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (reverted)
            {
                piece.MoveTo(movement!.BeforeX!.Value, movement.BeforeY!.Value);
                piece.Face(movement.BeforeLook!.Value);
                await _mapTokenRepository.UpdateAsync(piece);
            }
            if (entries.Count > 0)
                await _repository.DeleteRangeAsync(entries.Select(e => e.TurnId));
        });
        return new TurnResetResultInfo { Removed = entries.Count, Reverted = reverted || movement == null };
    }

    /// <summary>
    /// Finishes the current turn when every approved character acted; otherwise lists who is missing, unless
    /// the master forces it. NPCs never block.
    /// </summary>
    public async Task<TurnFinishResultInfo> FinishAsync(long userId, long campaignId, TurnFinishInfo info)
    {
        var campaign = await GetMasteredCampaignAsync(userId, campaignId);
        var entries = await _repository.ListByCampaignTurnAsync(campaignId, campaign.CurrentTurn);
        var acted = entries.Where(e => e.TurnType == TurnType.Action && e.CharacterId.HasValue)
            .Select(e => e.CharacterId!.Value).ToHashSet();
        var participations = await _campaignCharacterRepository.ListByCampaignAsync(campaignId, approvedOnly: true);
        var missingIds = participations.Select(p => p.CharacterId).Where(id => !acted.Contains(id)).Distinct().ToList();

        if (missingIds.Count > 0 && !info.Force)
        {
            var characters = await _characterRepository.ListByIdsAsync(missingIds);
            return new TurnFinishResultInfo
            {
                Finished = false,
                TurnNo = campaign.CurrentTurn,
                Pending = characters.Select(c => c.Name).OrderBy(n => n).ToList()
            };
        }

        var finished = campaign.CurrentTurn;
        campaign.AdvanceTurn();
        await _campaignRepository.UpdateAsync(campaign);
        return new TurnFinishResultInfo { Finished = true, FinishedTurn = finished, TurnNo = campaign.CurrentTurn };
    }

    /// <summary>Direct entry by the master; the only way to record an action result.</summary>
    public async Task<TurnInfo> CreateAsync(long userId, TurnInsertInfo info)
    {
        var campaign = await GetMasteredCampaignAsync(userId, info.CampaignId);
        var turnNo = info.TurnNo ?? campaign.CurrentTurn;
        var turn = (TurnType)info.TurnType switch
        {
            TurnType.Movement => Turn.Movement(campaign.CampaignId, info.MapId, info.CharacterId, info.NpcId, info.MapNpcId, turnNo,
                (Required(info.BeforeX, "beforeX"), Required(info.BeforeY, "beforeY"), Required(info.BeforeLook, "beforeLook")),
                (Required(info.X, "x"), Required(info.Y, "y"), Required(info.Look, "look"))),
            TurnType.Action => Turn.Action(campaign.CampaignId, info.MapId, info.CharacterId, info.NpcId, info.MapNpcId, turnNo, info.Description),
            TurnType.ActionResult => Turn.ActionResult(campaign.CampaignId, info.MapId, info.CharacterId, info.NpcId, info.MapNpcId, turnNo, info.Description),
            _ => throw new DomainValidationException("turnType", "O tipo deve ser 1 (Movement), 2 (Action) ou 3 (ActionResult).")
        };
        return (await MapToDtoAsync(new List<Turn> { await _repository.InsertAsync(turn) })).Single();
    }

    public async Task DeleteAsync(long userId, long turnId)
    {
        var turn = await _repository.GetByIdAsync(turnId)
            ?? throw new KeyNotFoundException("Registro de turno não encontrado.");
        await GetMasteredCampaignAsync(userId, turn.CampaignId);
        await _repository.DeleteAsync(turnId);
    }

    private static int Required(int? value, string field) =>
        value ?? throw new DomainValidationException(field, $"O campo {field} é obrigatório.");

    private async Task<(MapToken Piece, Map Map, Campaign Campaign)> GetPieceAsync(long mapTokenId)
    {
        var piece = await _mapTokenRepository.GetByIdAsync(mapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        var map = await _mapRepository.GetByIdAsync(piece.MapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        var campaign = await _campaignRepository.GetByIdAsync(map.CampaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        return (piece, map, campaign);
    }

    /// <summary>
    /// Who the piece is in the turn: a character (its owner or the master may act) or an NPC occurrence (master
    /// only). Objects don't take part in turns.
    /// </summary>
    private async Task<(long? CharacterId, long? NpcId, long? MapNpcId)> ResolveActorAsync(long userId, MapToken piece, Campaign campaign)
    {
        var isMaster = campaign.UserId == userId;
        if (piece.CampaignCharacterId is long participationId)
        {
            var participation = await _campaignCharacterRepository.GetByIdAsync(participationId)
                ?? throw new KeyNotFoundException("Participação não encontrada.");
            var character = await _characterRepository.GetByIdAsync(participation.CharacterId)
                ?? throw new KeyNotFoundException("Personagem não encontrado.");
            if (!isMaster && (character.UserId != userId || participation.Status != CampaignCharacterStatus.Approved))
                throw new UnauthorizedAccessException("Você só pode agir com os seus personagens.");
            return (character.CharacterId, null, null);
        }
        if (piece.MapNpcId is long mapNpcId)
        {
            if (!isMaster)
                throw new UnauthorizedAccessException("Apenas o mestre age com os NPCs.");
            var mapNpc = await _mapNpcRepository.GetByIdAsync(mapNpcId)
                ?? throw new KeyNotFoundException("NPC do mapa não encontrado.");
            return (null, mapNpc.NpcId, mapNpc.MapNpcId);
        }
        throw new DomainValidationException("mapTokenId", "Objetos não participam de turnos.");
    }

    private async Task<Campaign> GetReadableCampaignAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(campaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os turnos.");
        return campaign;
    }

    private async Task<Campaign> GetMasteredCampaignAsync(long userId, long campaignId)
    {
        var campaign = await _campaignRepository.GetByIdAsync(campaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre da campanha pode fazer isso.");
        return campaign;
    }

    /// <summary>Resolves the actor names in batch (characters, NPC occurrences and NPCs).</summary>
    private async Task<List<TurnInfo>> MapToDtoAsync(List<Turn> turns)
    {
        if (turns.Count == 0)
            return new List<TurnInfo>();

        var characterIds = turns.Where(t => t.CharacterId.HasValue).Select(t => t.CharacterId!.Value).Distinct().ToList();
        var mapNpcIds = turns.Where(t => t.MapNpcId.HasValue).Select(t => t.MapNpcId!.Value).Distinct().ToList();
        var npcIds = turns.Where(t => t.NpcId.HasValue).Select(t => t.NpcId!.Value).Distinct().ToList();
        var characters = characterIds.Count == 0 ? new Dictionary<long, string>()
            : (await _characterRepository.ListByIdsAsync(characterIds)).ToDictionary(c => c.CharacterId, c => c.Name);
        var mapNpcs = mapNpcIds.Count == 0 ? new Dictionary<long, string>()
            : (await _mapNpcRepository.ListByIdsAsync(mapNpcIds)).ToDictionary(m => m.MapNpcId, m => m.Name);
        var npcs = npcIds.Count == 0 ? new Dictionary<long, string>()
            : (await _npcRepository.ListByIdsAsync(npcIds)).ToDictionary(n => n.NpcId, n => n.Name);

        return turns.Select(t => new TurnInfo
        {
            TurnId = t.TurnId,
            CampaignId = t.CampaignId,
            MapId = t.MapId,
            TurnNo = t.TurnNo,
            TurnType = (int)t.TurnType,
            CharacterId = t.CharacterId,
            NpcId = t.NpcId,
            MapNpcId = t.MapNpcId,
            ActorName = t.CharacterId is long c ? characters.GetValueOrDefault(c, string.Empty)
                : t.MapNpcId is long m && mapNpcs.TryGetValue(m, out var occurrence) ? occurrence
                : t.NpcId is long n ? npcs.GetValueOrDefault(n, string.Empty) : string.Empty,
            BeforeX = t.BeforeX,
            BeforeY = t.BeforeY,
            BeforeLook = t.BeforeLook,
            X = t.X,
            Y = t.Y,
            Look = t.Look,
            Description = t.Description,
            CreatedAt = t.CreatedAt
        }).ToList();
    }
}
