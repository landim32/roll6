using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Domain.Realtime;
using Roll6.Domain.Turns;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// Campaign turns (016). Everyone at the table reads the turn; players act and reset only their own approved
/// characters; the master acts for any character or NPC occurrence, writes entries directly (action results
/// only this way) and finishes the turn.
/// </summary>
public partial class TurnService : ITurnService
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
    private readonly IUserRepository<User> _userRepository;
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly ICampaignNpcRepository<CampaignNpc> _campaignNpcRepository;
    private readonly IChatReadRepository<ChatRead> _chatReadRepository;
    private readonly IImageStorageAppService _imageStorage;
    private readonly IRealtimeNotifier _notifier;
    private readonly INotificationQueue _queue;

    /// <summary>Hexes taken on a map (031): resets and processed moves need the whole shape free.</summary>
    private readonly MapOccupancyLoader _occupancy;

    public TurnService(
        ITurnRepository<Turn> repository,
        ICampaignRepository<Campaign> campaignRepository,
        IMapRepository<Map> mapRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        ICharacterRepository<Character> characterRepository,
        IMapNpcRepository<MapNpc> mapNpcRepository,
        INpcRepository<Npc> npcRepository,
        IUnitOfWork unitOfWork,
        IUserRepository<User> userRepository,
        IMapModelRepository<MapModel> mapModelRepository,
        ICampaignNpcRepository<CampaignNpc> campaignNpcRepository,
        ITokenRepository<Token> tokenRepository,
        IChatReadRepository<ChatRead> chatReadRepository,
        IImageStorageAppService imageStorage,
        INotificationQueue queue,
        IRealtimeNotifier notifier)
    {
        _queue = queue;
        _chatReadRepository = chatReadRepository;
        _imageStorage = imageStorage;
        _occupancy = new MapOccupancyLoader(mapModelRepository, mapTokenRepository, tokenRepository, campaignCharacterRepository, mapNpcRepository);
        _campaignNpcRepository = campaignNpcRepository;
        _mapModelRepository = mapModelRepository;
        _notifier = notifier;
        _userRepository = userRepository;
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

    /// <summary>
    /// Narration of the requested turn, or of the latest finished turn that has one. Entries of the same turn are
    /// joined with a blank line; <c>finishedAt</c> is the last entry's time (null while that turn is in progress).
    /// </summary>
    public async Task<TurnNarrationInfo?> GetNarrationAsync(long userId, long campaignId, int? turnNo)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        if (turnNo is int requested) CheckTurnNo(campaign, requested);
        var entries = await _repository.ListNarrationsAsync(campaignId, turnNo, campaign.CurrentTurn);
        if (entries.Count == 0) return null;
        var number = entries[0].TurnNo;
        return new TurnNarrationInfo
        {
            TurnNo = number,
            Narration = string.Join("\n\n", entries.Select(e => e.Description ?? string.Empty)),
            FinishedAt = number == campaign.CurrentTurn ? null : entries[^1].CreatedAt
        };
    }

    /// <summary>
    /// Everything that happened in a turn as markdown (024): the entries in order and where every character/NPC piece
    /// of the turn's map is — now for the turn in progress, after its last move for a finished turn.
    /// </summary>
    public async Task<TurnSummaryInfo> GetSummaryAsync(long userId, long campaignId, int? turnNo)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var number = CheckTurnNo(campaign, turnNo);
        var current = number == campaign.CurrentTurn;

        var entries = await _repository.ListByCampaignTurnAsync(campaignId, number);
        var mapId = current
            ? campaign.CurrentMapId ?? entries.LastOrDefault(e => e.MapId.HasValue)?.MapId
            : entries.LastOrDefault(e => e.MapId.HasValue)?.MapId ?? campaign.CurrentMapId;
        var pieces = mapId is long id
            ? (await _mapTokenRepository.ListByMapAsync(id)).Where(p => p.CampaignCharacterId.HasValue || p.MapNpcId.HasValue).ToList()
            : new List<MapToken>();

        // Names in batch: characters (and owners), NPC occurrences, NPCs and authors — shared with the turn data (027).
        var participations = (await _campaignCharacterRepository.ListByIdsAsync(
                pieces.Where(p => p.CampaignCharacterId.HasValue).Select(p => p.CampaignCharacterId!.Value)))
            .ToDictionary(p => p.CampaignCharacterId, p => p.CharacterId);
        var names = await LoadNamesAsync(campaign, entries, participations.Values,
            pieces.Where(p => p.MapNpcId.HasValue).Select(p => p.MapNpcId!.Value));
        var lines = BuildLines(entries, names);

        // Finished turn: each piece where its last move up to that turn left it (when on this map).
        var lastMoves = current || mapId == null
            ? new Dictionary<(long?, long?), Turn>()
            : (await _repository.ListLastMovementsAsync(campaignId, number)).Where(t => t.MapId == mapId)
                .ToDictionary(t => (t.CharacterId, t.MapNpcId));
        var positions = pieces.Select(p =>
        {
            long? characterId = p.CampaignCharacterId is long cc && participations.TryGetValue(cc, out var ch) ? ch : null;
            var key = (characterId, characterId.HasValue ? null : p.MapNpcId);
            var (x, y, look) = lastMoves.TryGetValue(key, out var move) && move is { X: int mx, Y: int my, Look: int ml }
                ? (mx, my, ml) : (p.X, p.Y, p.Look);
            var label = characterId is long cid ? names.CharacterLabel(cid) : names.NpcLabel(p.MapNpcId, null);
            return new SummaryPosition(label, x, y, look);
        }).ToList();

        return new TurnSummaryInfo { CampaignId = campaignId, TurnNo = number, Markdown = TurnSummary.Build(lines, positions) };
    }

    public async Task<TurnInfo> ActAsync(long userId, TurnActInfo info)
    {
        var (piece, map, campaign) = await GetPieceAsync(info.MapTokenId);
        var actor = await ResolveActorAsync(userId, piece, campaign);
        var turn = Turn.Action(campaign.CampaignId, map.MapId, actor.CharacterId, actor.NpcId, actor.MapNpcId,
            campaign.CurrentTurn, userId, info.Description);
        var result = (await MapToDtoAsync(new List<Turn> { await _repository.InsertAsync(turn) })).Single();
        await PublishTurnChangedAsync(campaign.CampaignId, userId);
        await NotifyActionAsync(campaign, userId, actor.CharacterId, info.Description);
        return result;
    }

    /// <summary>
    /// Removes the piece's entries of the current turn and undoes its move when its whole shape fits there again.
    /// </summary>
    public async Task<TurnResetResultInfo> ResetAsync(long userId, TurnPieceInfo info)
    {
        var (piece, map, campaign) = await GetPieceAsync(info.MapTokenId);
        var actor = await ResolveActorAsync(userId, piece, campaign);
        // Character/NPC changes are history (024): the reset only undoes the move and the action.
        var entries = (await _repository.ListByActorTurnAsync(campaign.CampaignId, campaign.CurrentTurn, actor.CharacterId, actor.MapNpcId))
            .Where(e => e.TurnType is TurnType.Movement or TurnType.Action)
            .ToList();
        var movement = entries.FirstOrDefault(e => e.TurnType == TurnType.Movement);

        var reverted = false;
        if (movement is { BeforeX: int x, BeforeY: int y, BeforeLook: int look } && movement.MapId == map.MapId)
        {
            var layout = await _occupancy.LoadAsync(map);
            reverted = layout.Occupancy.Fits(HexGrid.Footprint(x, y, look, layout.SpaceOf(piece)), layout.Columns, layout.Rows,
                piece.MapTokenId) == FitResult.Ok;
        }

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
        await PublishTurnChangedAsync(campaign.CampaignId, userId);
        if (reverted)
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaign.CampaignId, userId, map.MapId));
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
        // The chat shows where the turn ended (041).
        var divider = Turn.TurnFinished(campaignId, campaign.CurrentMapId, finished, userId);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _repository.InsertAsync(divider);
            await _campaignRepository.UpdateAsync(campaign);
        });
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_FINISHED, campaignId, userId,
            data: new { finishedTurn = finished, turnNo = campaign.CurrentTurn }));
        await NotifyTurnFinishedAsync(campaign, userId, finished);
        return new TurnFinishResultInfo { Finished = true, FinishedTurn = finished, TurnNo = campaign.CurrentTurn };
    }

    /// <summary>
    /// Direct entry by the master in any turn from 1 up to the current one (030) — the only way to record an action
    /// result. Writes only the log: pieces and values don't change and the one-move-per-turn rule doesn't apply.
    /// </summary>
    public async Task<TurnInfo> CreateAsync(long userId, TurnInsertInfo info)
    {
        var campaign = await GetMasteredCampaignAsync(userId, info.CampaignId);
        var turnNo = info.TurnNo ?? campaign.CurrentTurn;
        Turn.EnsureTurnInRange(turnNo, campaign.CurrentTurn);
        if (info.MapId is long mapId)
            await EnsureMapInCampaignAsync(mapId, campaign.CampaignId);
        var type = (TurnType)info.TurnType;
        // Chat messages and dividers (041) are written by the chat and the turn itself, never as a turn record.
        if (!TurnTypes.IsLog(type))
            throw new DomainValidationException("turnType",
                "O tipo deve ser 1 (Movement), 2 (Action), 3 (ActionResult), 4 (CharacterUpdate) ou 5 (Narration).");
        if (type == TurnType.Narration)
            EnsureNoActor(info);
        else if (Enum.IsDefined(type))
            await EnsureActorInCampaignAsync(campaign.CampaignId, info.CharacterId, info.NpcId, info.MapNpcId);
        var turn = type switch
        {
            TurnType.Movement => Turn.Movement(campaign.CampaignId, info.MapId, info.CharacterId, info.NpcId, info.MapNpcId, turnNo, userId,
                (Required(info.BeforeX, "beforeX"), Required(info.BeforeY, "beforeY"), Required(info.BeforeLook, "beforeLook")),
                (Required(info.X, "x"), Required(info.Y, "y"), Required(info.Look, "look")), info.Moved),
            TurnType.Action => Turn.Action(campaign.CampaignId, info.MapId, info.CharacterId, info.NpcId, info.MapNpcId, turnNo, userId, info.Description),
            TurnType.ActionResult => Turn.ActionResult(campaign.CampaignId, info.MapId, info.CharacterId, info.NpcId, info.MapNpcId, turnNo, userId, info.Description),
            TurnType.CharacterUpdate => Turn.CharacterUpdate(campaign.CampaignId, info.MapId, info.CharacterId, info.NpcId, info.MapNpcId, turnNo, userId,
                ToChanges(info.Changes)),
            TurnType.Narration => Turn.Narration(campaign.CampaignId, info.MapId, turnNo, userId, info.Description),
            _ => throw new DomainValidationException("turnType",
                "O tipo deve ser 1 (Movement), 2 (Action), 3 (ActionResult), 4 (CharacterUpdate) ou 5 (Narration).")
        };
        var result = (await MapToDtoAsync(new List<Turn> { await _repository.InsertAsync(turn) })).Single();
        await PublishTurnChangedAsync(campaign.CampaignId, userId);
        if (type == TurnType.Narration)
            _queue.Enqueue(TableNotices.Narration(campaign.CampaignId, userId, info.Description));
        return result;
    }

    /// <summary>Deletes any entry of any turn (master only); pieces and values are not rolled back.</summary>
    public async Task DeleteAsync(long userId, long turnId)
    {
        var turn = await GetLogEntryAsync(turnId);
        await GetMasteredCampaignAsync(userId, turn.CampaignId);
        await _repository.DeleteAsync(turnId);
        await PublishTurnChangedAsync(turn.CampaignId, userId);
    }

    /// <summary>
    /// A turn record (types 1–5, not deleted from the chat) by id (041): chat messages and end-of-turn dividers share
    /// the table but are not turn records, so the turn's admin tools don't see them.
    /// </summary>
    private async Task<Turn> GetLogEntryAsync(long turnId)
    {
        var turn = await _repository.GetByIdAsync(turnId);
        if (turn == null || !turn.IsLog || turn.IsDeleted)
            throw new KeyNotFoundException("Registro de turno não encontrado.");
        return turn;
    }

    private Task PublishTurnChangedAsync(long campaignId, long userId) =>
        _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, campaignId, userId));

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
        var users = (await _userRepository.ListByIdsAsync(turns.Select(t => t.UserId).Distinct()))
            .ToDictionary(u => u.UserId, u => u.Name);

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
            UserId = t.UserId,
            UserName = users.GetValueOrDefault(t.UserId, string.Empty),
            Moved = t.Moved,
            Changes = t.Changes?.Select(c => new TurnChangeInfo { Field = c.Field, Before = c.Before, After = c.After }).ToList(),
            CreatedAt = t.CreatedAt
        }).ToList();
    }
}
