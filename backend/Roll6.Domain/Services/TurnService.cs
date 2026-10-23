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

using Roll6.Domain.Npcs;

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
    private readonly IAskDispatcher _askDispatcher;
    private readonly IGmDispatcher _gm;
    private readonly ITurnProcessingRegistry _processing;
    private readonly INotificationQueue _queue;
    private readonly IChatReactionRepository<ChatReaction> _chatReactionRepository;
    private readonly IChatPollRepository<ChatPollOption, ChatPollVote> _chatPollRepository;
    private readonly ITurnWhisperRepository<TurnWhisperTarget> _whisperRepository;

    /// <summary>Hexes taken on a map (031): resets and processed moves need the whole shape free.</summary>
    private readonly MapOccupancyLoader _occupancy;
    private readonly NpcCommandLoader _npcCommand;

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
        IChatReactionRepository<ChatReaction> chatReactionRepository,
        IChatPollRepository<ChatPollOption, ChatPollVote> chatPollRepository,
        ITurnWhisperRepository<TurnWhisperTarget> whisperRepository,
        INotificationQueue queue,
        IRealtimeNotifier notifier,
        IAskDispatcher askDispatcher,
        IGmDispatcher gmDispatcher,
        ITurnProcessingRegistry? processing = null)
    {
        _processing = processing ?? new TurnProcessingRegistry();
        _whisperRepository = whisperRepository;
        _chatPollRepository = chatPollRepository;
        _queue = queue;
        _chatReactionRepository = chatReactionRepository;
        _chatReadRepository = chatReadRepository;
        _imageStorage = imageStorage;
        _occupancy = new MapOccupancyLoader(mapModelRepository, mapTokenRepository, tokenRepository, campaignCharacterRepository, mapNpcRepository);
        _npcCommand = new NpcCommandLoader(campaignNpcRepository, campaignCharacterRepository, characterRepository);
        _campaignNpcRepository = campaignNpcRepository;
        _mapModelRepository = mapModelRepository;
        _notifier = notifier;
        _askDispatcher = askDispatcher;
        _gm = gmDispatcher;
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
        var entries = await _repository.ListByCampaignTurnAsync(campaignId, campaign.CurrentTurn);
        return new TurnStateInfo
        {
            TurnNo = campaign.CurrentTurn,
            Entries = await MapToDtoAsync(entries, await MaskForViewerAsync(campaign, userId, entries))
        };
    }

    public async Task<List<TurnInfo>> ListAsync(long userId, long campaignId, int turnNo)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        var entries = await _repository.ListByCampaignTurnAsync(campaignId, turnNo);
        return await MapToDtoAsync(entries, await MaskForViewerAsync(campaign, userId, entries));
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
        await MaskForViewerAsync(campaign, userId, entries);
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
        Campaign campaign;
        long? mapId;
        (long? CharacterId, long? NpcId, long? MapNpcId) actor;
        TurnTarget? target = null;
        if (info.MapTokenId is long mapTokenId && info.CampaignId == null && info.CharacterId == null)
        {
            var (piece, map, pieceCampaign) = await GetPieceAsync(mapTokenId);
            campaign = pieceCampaign;
            actor = await ResolveActorAsync(userId, piece, campaign);
            mapId = map.MapId;
            // 098: "Agir sobre…" — the hex (and the piece on it, as it is now) the action is about.
            if (info.Target != null)
                target = await ResolveTargetAsync(map, piece, campaign, info.Target, actor.CharacterId, actor.MapNpcId);
        }
        else if (info.MapTokenId == null && info.CampaignId is long campaignId && info.CharacterId is long characterId)
        {
            // 080: a character of the campaign acts from the chat without a piece on any map.
            if (info.Target != null)
                throw new DomainValidationException("target", "A ação sobre um hex precisa de uma peça no mapa.");
            campaign = await _campaignRepository.GetByIdAsync(campaignId)
                ?? throw new KeyNotFoundException("Campanha não encontrada.");
            actor = await ResolveCharacterActorAsync(userId, campaign, characterId);
            mapId = campaign.CurrentMapId;
        }
        else
            throw new DomainValidationException("mapTokenId",
                "Informe a peça (mapTokenId) ou a campanha e o personagem (campaignId e characterId).");
        campaign.EnsurePlayable(); // 049: the turn moves only while the campaign is active
        var turn = Turn.Action(campaign.CampaignId, mapId, actor.CharacterId, actor.NpcId, actor.MapNpcId,
            campaign.CurrentTurn, userId, info.Description, target);
        // 047: a whispered action still is the actor's action of the turn; only who reads its text changes.
        var whisper = await ResolveWhisperAsync(campaign, userId, actor.CharacterId, info.WhisperCharacterIds, info.WhisperMaster);
        await ApplyReplyAsync(turn, info.ReplyToTurnId);
        // 044: one valid action per actor and turn — the previous one stays in the chat as "Ação cancelada". Since 073
        // also in free mode (054 used to keep every action there).
        var cancelled = await CancelValidActionsAsync(campaign, actor.CharacterId, actor.CharacterId.HasValue ? null : actor.MapNpcId);
        // 099: declaring another action ends the actor's repeated action.
        var repeat = await RepeatToClearAsync(campaign, actor.CharacterId, actor.CharacterId.HasValue ? null : actor.MapNpcId);
        var saved = await SaveEntryAsync(turn, whisper, async () =>
        {
            foreach (var previous in cancelled)
                await _repository.UpdateAsync(previous);
            if (repeat != null)
                await SaveRepeatHolderAsync(repeat);
        });
        if (repeat != null)
            await PublishRepeatChangedAsync(campaign.CampaignId, userId);
        var result = (await MapToDtoAsync(new List<Turn> { saved }, await LoadWhispersAsync(new[] { saved }))).Single();
        foreach (var previous in cancelled)
            await PublishUpdatedAsync(campaign, userId, previous);
        await PublishTurnChangedAsync(campaign.CampaignId, userId);
        // 074: a replaced action is not a new one for "Falta…" (the missing list did not change).
        await NotifyActionAsync(campaign, userId, actor.CharacterId, actor.MapNpcId, info.Description, firstAction: cancelled.Count == 0);
        // 096: the last action of a complete turn hands it to the GM.
        await CheckAsync(campaign.CampaignId, "action");
        return result;
    }

    /// <summary>
    /// Removes the piece's entries of the current turn and undoes its move when its whole shape fits there again.
    /// </summary>
    public async Task<TurnResetResultInfo> ResetAsync(long userId, TurnPieceInfo info)
    {
        var (piece, map, campaign) = await GetPieceAsync(info.MapTokenId);
        var actor = await ResolveActorAsync(userId, piece, campaign);
        campaign.EnsurePlayable(); // 049: the turn moves only while the campaign is active
        // Character/NPC changes are history (024): the reset only undoes the move and the action.
        // 054: in free mode no move is recorded and a move recorded before the switch must not teleport the piece
        // back during a free scene — the reset cancels the actions only and the piece stays where it is.
        var entries = (await _repository.ListByActorTurnAsync(campaign.CampaignId, campaign.CurrentTurn, actor.CharacterId, actor.MapNpcId))
            .Where(e => e.TurnType == TurnType.Action || (e.TurnType == TurnType.Movement && !campaign.FreeMode))
            .ToList();
        var movement = entries.FirstOrDefault(e => e.TurnType == TurnType.Movement);

        var reverted = false;
        if (movement is { BeforeX: int x, BeforeY: int y, BeforeLook: int look } && movement.MapId == map.MapId)
        {
            var layout = await _occupancy.LoadAsync(map);
            reverted = layout.Occupancy.Fits(HexGrid.Footprint(x, y, look, layout.SpaceOf(piece)), layout.Columns, layout.Rows,
                piece.MapTokenId) == FitResult.Ok;
        }

        var cancelledAt = DateTime.UtcNow;
        var actions = entries.Where(e => e.Cancel(cancelledAt)).ToList();
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (reverted)
            {
                piece.MoveTo(movement!.BeforeX!.Value, movement.BeforeY!.Value);
                piece.Face(movement.BeforeLook!.Value);
                await _mapTokenRepository.UpdateAsync(piece);
            }
            // 044: the move is undone and deleted; the action stays in the chat as "Ação cancelada".
            var movements = entries.Where(e => e.TurnType == TurnType.Movement).Select(e => e.TurnId).ToList();
            if (movements.Count > 0)
                await _repository.DeleteRangeAsync(movements);
            foreach (var action in actions)
                await _repository.UpdateAsync(action);
        });
        foreach (var action in actions)
            await PublishUpdatedAsync(campaign, userId, action);
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
        campaign.EnsurePlayable(); // 049: the turn moves only while the campaign is active
        var (approvedIds, acted) = await ActedAsync(campaign);
        var missingIds = approvedIds.Where(id => !acted.Contains(id)).ToList();

        // 054: in free mode nobody owes the play — the turn finishes at once (and the mode stays on).
        if (missingIds.Count > 0 && !info.Force && !campaign.FreeMode)
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
        // 099: every active repeated action is the actor's action of the new turn.
        var repeated = await RepeatedActionsAsync(campaign, userId);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _repository.InsertAsync(divider);
            foreach (var action in repeated)
                await _repository.InsertAsync(action);
            await _campaignRepository.UpdateAsync(campaign);
        });
        _processing.Clear(campaignId); // 101: the processed turn is over
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
    /// Who the piece is in the turn: a character (its owner or the master may act) or an NPC occurrence (the master, or
    /// since 071 the player commanding the ally). Objects don't take part in turns.
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
            var mapNpc = await _mapNpcRepository.GetByIdAsync(mapNpcId)
                ?? throw new KeyNotFoundException("NPC do mapa não encontrado.");
            if (!isMaster && !await _npcCommand.CommandsAsync(userId, campaign, mapNpc.NpcId))
                throw new UnauthorizedAccessException("Apenas o mestre ou quem comanda o aliado age com este NPC.");
            return (null, mapNpc.NpcId, mapNpc.MapNpcId);
        }
        throw new DomainValidationException("mapTokenId", "Objetos não participam de turnos.");
    }

    /// <summary>
    /// 098: the target of an action — a hex inside the actor's map and, when a piece covers it, a snapshot of that piece
    /// as the table shows it now (the one drawn on top when several share the hex in free mode; or the one the caller
    /// saw, which must cover the hex). Nothing is re-read later: the target may move or leave before the turn is
    /// processed, and the record says what the player aimed at.
    /// </summary>
    private async Task<TurnTarget> ResolveTargetAsync(Map map, MapToken actor, Campaign campaign, TurnTargetInsertInfo info,
        long? actorCharacterId, long? actorMapNpcId)
    {
        var layout = await _occupancy.LoadAsync(map);
        if (!HexGrid.IsInsideGrid(info.X, info.Y, layout.Columns, layout.Rows))
            throw new DomainValidationException("target", "O hex está fora do mapa.");
        var covering = layout.Occupancy.PiecesAt(info.X, info.Y);
        long? mapTokenId;
        if (info.MapTokenId is long seen)
        {
            if (!covering.Contains(seen))
                throw new DomainValidationException("target", "Não há essa peça nesse hex.");
            mapTokenId = seen;
        }
        else
            mapTokenId = covering.Count == 0 ? null : covering.Max();
        var distance = HexGrid.Distance(actor.X, actor.Y, info.X, info.Y);
        if (mapTokenId == null)
            return TurnTarget.Hex(info.X, info.Y, distance);

        var piece = mapTokenId == actor.MapTokenId ? actor
            : await _mapTokenRepository.GetByIdAsync(mapTokenId.Value) ?? throw new DomainValidationException("target", "Não há essa peça nesse hex.");
        var kind = piece.TokenType switch
        {
            MapTokenType.Character => TurnTarget.KIND_CHARACTER,
            MapTokenType.Npc => TurnTarget.KIND_NPC,
            _ => TurnTarget.KIND_OBJECT
        };
        if (piece.MapTokenId == actor.MapTokenId)
            return TurnTarget.Piece(info.X, info.Y, distance, piece.MapTokenId, kind, TurnTarget.SIDE_SELF, piece.Name,
                characterId: actorCharacterId, mapNpcId: actorMapNpcId, look: piece.Look);
        if (piece.CampaignCharacterId is long participationId)
        {
            var participation = await _campaignCharacterRepository.GetByIdAsync(participationId);
            var character = participation == null ? null : await _characterRepository.GetByIdAsync(participation.CharacterId);
            return TurnTarget.Piece(info.X, info.Y, distance, piece.MapTokenId, kind, TurnTarget.SIDE_ALLY,
                character?.Name ?? piece.Name, characterId: participation?.CharacterId, look: piece.Look,
                posture: participation == null ? null : (int)participation.Posture, status: participation?.CharacterStatus,
                currentLife: participation?.CurrentLife, totalLife: character?.Life,
                currentEnergy: participation?.CurrentEnergy, totalEnergy: character?.Energy);
        }
        if (piece.MapNpcId is long mapNpcId)
        {
            var instance = await _mapNpcRepository.GetByIdAsync(mapNpcId);
            var npc = instance == null ? null : await _npcRepository.GetByIdAsync(instance.NpcId);
            var campaignNpc = instance == null ? null : await _campaignNpcRepository.GetAsync(campaign.CampaignId, instance.NpcId);
            var side = campaignNpc?.Category switch
            {
                NpcCategory.Ally => TurnTarget.SIDE_ALLY,
                NpcCategory.Neutral => TurnTarget.SIDE_NEUTRAL,
                _ => TurnTarget.SIDE_ENEMY
            };
            return TurnTarget.Piece(info.X, info.Y, distance, piece.MapTokenId, kind, side, instance?.Name ?? piece.Name,
                mapNpcId: mapNpcId, look: piece.Look, posture: instance == null ? null : (int)instance.Posture, status: instance?.Status,
                currentLife: instance?.CurrentLife, totalLife: npc?.Life, currentEnergy: instance?.CurrentEnergy, totalEnergy: npc?.Energy);
        }
        return TurnTarget.Piece(info.X, info.Y, distance, piece.MapTokenId, kind, TurnTarget.SIDE_OBJECT, piece.Name, look: piece.Look);
    }

    /// <summary>"declared" / "turnStart" for an action from a repeated action (099); null otherwise.</summary>
    private static string? RepeatKind(RepeatSource? repeated) => repeated switch
    {
        RepeatSource.Declared => "declared",
        RepeatSource.TurnStart => "turnStart",
        _ => null
    };

    /// <summary>The target snapshot as read (098); null when there is none.</summary>
    private static TurnTargetInfo? ToTargetInfo(TurnTarget? target) => target == null ? null : new TurnTargetInfo
    {
        X = target.X,
        Y = target.Y,
        Distance = target.Distance,
        MapTokenId = target.MapTokenId,
        Kind = target.Kind,
        KindLabel = target.KindLabel(),
        Side = target.Side,
        SideLabel = target.SideLabel(),
        Name = target.Name,
        CharacterId = target.CharacterId,
        MapNpcId = target.MapNpcId,
        Look = target.Look,
        LookName = target.Look is int look ? TurnSummary.Direction(look) : null,
        Posture = target.Posture,
        PostureLabel = target.PostureLabel(),
        Status = target.Status,
        CurrentLife = target.CurrentLife,
        TotalLife = target.TotalLife,
        CurrentEnergy = target.CurrentEnergy,
        TotalEnergy = target.TotalEnergy,
        Text = target.Describe()
    };

    /// <summary>
    /// 080: a character acting without a piece — the same checks as a character piece: its current owner with an approved
    /// participation, or the campaign master for any participation of the campaign.
    /// </summary>
    private async Task<(long? CharacterId, long? NpcId, long? MapNpcId)> ResolveCharacterActorAsync(long userId, Campaign campaign, long characterId)
    {
        var participation = await _campaignCharacterRepository.GetAsync(campaign.CampaignId, characterId)
            ?? throw new KeyNotFoundException("Participação não encontrada.");
        var character = await _characterRepository.GetByIdAsync(characterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
        if (campaign.UserId != userId && (character.UserId != userId || participation.Status != CampaignCharacterStatus.Approved))
            throw new UnauthorizedAccessException("Você só pode agir com os seus personagens.");
        return (character.CharacterId, null, null);
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
    private async Task<List<TurnInfo>> MapToDtoAsync(List<Turn> turns) => await MapToDtoAsync(turns, WhisperData.Empty);

    private async Task<List<TurnInfo>> MapToDtoAsync(List<Turn> turns, WhisperData whispers)
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
            Whisper = t.IsWhisper && !whispers.Masked.Contains(t.TurnId),
            WhisperHidden = whispers.Masked.Contains(t.TurnId),
            Moved = t.Moved,
            Changes = t.Changes?.Select(c => new TurnChangeInfo { Field = c.Field, Before = c.Before, After = c.After }).ToList(),
            Target = ToTargetInfo(t.Target),
            Repeated = RepeatKind(t.Repeated),
            CreatedAt = t.CreatedAt
        }).ToList();
    }
}
