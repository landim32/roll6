using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Domain.Realtime;
using Roll6.Domain.Turns;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;

namespace Roll6.Domain.Services;

/// <summary>
/// Turn data and turn processing for AI assistants (027): the whole table in one read, and one atomic write that
/// saves the result of the turn, narrates it and finishes it. Names and the "## Ações" text come from the same code as
/// the turn summary (024).
/// </summary>
public partial class TurnService
{
    private const int MAX_STATUS = 260;

    /// <summary>Names used to write the turn: characters with their owners, NPC occurrences, NPCs and users.</summary>
    private sealed class TurnNames
    {
        public required Campaign Campaign { get; init; }
        public required Dictionary<long, Character> Characters { get; init; }
        public required Dictionary<long, string> MapNpcs { get; init; }
        public required Dictionary<long, string> Npcs { get; init; }
        public required Dictionary<long, string> Users { get; init; }

        public string User(long userId) => Users.GetValueOrDefault(userId, string.Empty);

        public string CharacterLabel(long characterId) => Characters.TryGetValue(characterId, out var c)
            ? $"{c.Name} ({User(c.UserId)})" : "?";

        public string NpcLabel(long? mapNpcId, long? npcId) =>
            $"{(mapNpcId is long m && MapNpcs.TryGetValue(m, out var name) ? name : npcId is long n ? Npcs.GetValueOrDefault(n, "NPC") : "NPC")} (GM)";

        /// <summary>The owner acting on their own character is the character itself; otherwise the master shows as GM.</summary>
        public string? AuthorLabel(Turn e)
        {
            if (e.CharacterId is long c && Characters.TryGetValue(c, out var character) && character.UserId == e.UserId)
                return null;
            return e.UserId == Campaign.UserId ? $"GM ({User(e.UserId)})" : User(e.UserId);
        }
    }

    private async Task<TurnNames> LoadNamesAsync(Campaign campaign, IReadOnlyCollection<Turn> entries,
        IEnumerable<long> characterIds, IEnumerable<long> mapNpcIds)
    {
        var characters = (await _characterRepository.ListByIdsAsync(entries.Where(e => e.CharacterId.HasValue)
                .Select(e => e.CharacterId!.Value).Concat(characterIds).Distinct()))
            .ToDictionary(c => c.CharacterId);
        var mapNpcs = (await _mapNpcRepository.ListByIdsAsync(entries.Where(e => e.MapNpcId.HasValue).Select(e => e.MapNpcId!.Value)
                .Concat(mapNpcIds).Distinct()))
            .ToDictionary(m => m.MapNpcId, m => m.Name);
        var npcs = (await _npcRepository.ListByIdsAsync(entries.Where(e => e.NpcId.HasValue).Select(e => e.NpcId!.Value).Distinct()))
            .ToDictionary(n => n.NpcId, n => n.Name);
        var users = (await _userRepository.ListByIdsAsync(entries.Select(e => e.UserId)
                .Concat(characters.Values.Select(c => c.UserId)).Append(campaign.UserId).Distinct()))
            .ToDictionary(u => u.UserId, u => u.Name);
        return new TurnNames { Campaign = campaign, Characters = characters, MapNpcs = mapNpcs, Npcs = npcs, Users = users };
    }

    /// <summary>The entries ready to be written (movement points summed per actor along the turn).</summary>
    private static List<SummaryLine> BuildLines(IEnumerable<Turn> entries, TurnNames names)
    {
        var spent = new Dictionary<(long?, long?), int>();
        var lines = new List<SummaryLine>();
        foreach (var e in entries)
        {
            var key = (e.CharacterId, e.MapNpcId ?? e.NpcId);
            if (e.Moved is int moved)
                spent[key] = spent.GetValueOrDefault(key) + moved;
            lines.Add(new SummaryLine
            {
                Type = e.TurnType,
                Actor = e.TurnType == TurnType.Narration ? string.Empty
                    : e.CharacterId is long characterId ? names.CharacterLabel(characterId) : names.NpcLabel(e.MapNpcId, e.NpcId),
                Author = e.TurnType is TurnType.Movement or TurnType.Action && e.CharacterId.HasValue ? null : names.AuthorLabel(e),
                IsNpc = !e.CharacterId.HasValue,
                Before = e is { BeforeX: int bx, BeforeY: int by, BeforeLook: int bl } ? (bx, by, bl) : null,
                After = e is { X: int x, Y: int y, Look: int l } ? (x, y, l) : null,
                Moved = e.Moved,
                MovedTotal = spent.GetValueOrDefault(key),
                Description = e.Description,
                Changes = e.Changes
            });
        }
        return lines;
    }

    private static int CheckTurnNo(Campaign campaign, int? turnNo)
    {
        var number = turnNo ?? campaign.CurrentTurn;
        if (number < 1 || number > campaign.CurrentTurn)
            throw new DomainValidationException("turnNo", $"O turno deve estar entre 1 e {campaign.CurrentTurn}.");
        return number;
    }

    // ------------------------------------------------------------------ turn data

    public async Task<TurnDataInfo> GetDataAsync(long userId, long campaignId, int? turnNo)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        return await BuildDataAsync(campaign, CheckTurnNo(campaign, turnNo));
    }

    /// <summary>Approved characters, NPC occurrences of the current map (current values) and the actions of the turn.</summary>
    private async Task<TurnDataInfo> BuildDataAsync(Campaign campaign, int turnNo)
    {
        var entries = await _repository.ListByCampaignTurnAsync(campaign.CampaignId, turnNo);
        var participations = await _campaignCharacterRepository.ListByCampaignAsync(campaign.CampaignId, approvedOnly: true);
        var mapId = campaign.CurrentMapId;
        var pieces = mapId is long id ? await _mapTokenRepository.ListByMapAsync(id) : new List<MapToken>();
        var occurrences = mapId is long mid ? await _mapNpcRepository.ListByMapAsync(mid) : new List<MapNpc>();
        var npcTotals = (await _npcRepository.ListByIdsAsync(occurrences.Select(o => o.NpcId).Distinct())).ToDictionary(n => n.NpcId);
        var names = await LoadNamesAsync(campaign, entries, participations.Select(p => p.CharacterId), occurrences.Select(o => o.MapNpcId));

        var characterPieces = pieces.Where(p => p.CampaignCharacterId.HasValue).ToDictionary(p => p.CampaignCharacterId!.Value);
        var npcPieces = pieces.Where(p => p.MapNpcId.HasValue).ToDictionary(p => p.MapNpcId!.Value);

        return new TurnDataInfo
        {
            CampaignId = campaign.CampaignId,
            TurnNo = turnNo,
            CurrentTurn = campaign.CurrentTurn,
            MapId = mapId,
            Characters = participations
                .Where(p => names.Characters.ContainsKey(p.CharacterId))
                .Select(p =>
                {
                    var character = names.Characters[p.CharacterId];
                    var piece = characterPieces.GetValueOrDefault(p.CampaignCharacterId);
                    return new TurnDataCharacterInfo
                    {
                        CharacterId = character.CharacterId,
                        CampaignCharacterId = p.CampaignCharacterId,
                        Name = character.Name,
                        PlayerName = names.User(character.UserId),
                        CurrentLife = p.CurrentLife,
                        TotalLife = character.Life,
                        CurrentEnergy = p.CurrentEnergy,
                        TotalEnergy = character.Energy,
                        CurrentMove = p.CurrentMove,
                        Move = character.Move,
                        Status = p.CharacterStatus,
                        Posture = (int)p.Posture,
                        MapTokenId = piece?.MapTokenId,
                        X = piece?.X,
                        Y = piece?.Y,
                        Look = piece?.Look,
                        LookName = piece == null ? null : TurnSummary.Direction(piece.Look)
                    };
                })
                .OrderBy(c => c.Name, StringComparer.CurrentCultureIgnoreCase)
                .ToList(),
            Npcs = occurrences
                .Select(o =>
                {
                    var npc = npcTotals.GetValueOrDefault(o.NpcId);
                    var piece = npcPieces.GetValueOrDefault(o.MapNpcId);
                    return new TurnDataNpcInfo
                    {
                        MapNpcId = o.MapNpcId,
                        NpcId = o.NpcId,
                        MapTokenId = piece?.MapTokenId,
                        Name = o.Name,
                        CurrentLife = o.CurrentLife,
                        TotalLife = npc?.Life ?? o.CurrentLife,
                        CurrentEnergy = o.CurrentEnergy,
                        TotalEnergy = npc?.Energy ?? o.CurrentEnergy,
                        Status = o.Status,
                        Posture = (int)o.Posture,
                        X = piece?.X,
                        Y = piece?.Y,
                        Look = piece?.Look,
                        LookName = piece == null ? null : TurnSummary.Direction(piece.Look)
                    };
                })
                .OrderBy(n => n.Name, StringComparer.CurrentCultureIgnoreCase)
                .ToList(),
            Actions = TurnSummary.BuildActions(BuildLines(entries, names))
        };
    }

    // ------------------------------------------------------------------ processing

    /// <summary>A validated change to one piece (participation or occurrence), applied only if the whole batch is valid.</summary>
    private sealed class PieceChange
    {
        public string Key { get; init; } = string.Empty;
        public MapToken? Piece { get; init; }
        public (int X, int Y, int Look)? Target { get; set; }
    }

    /// <summary>
    /// Saves the result of the turn decided by the master (or an assistant with the master's key) and finishes it:
    /// validates the whole batch first (same rules as the single updates, positions checked on the final state), then
    /// writes everything in one transaction — values, pieces, CharacterUpdate/Movement/Narration entries by the master —
    /// and advances the turn. Nothing changes when anything is invalid.
    /// </summary>
    public async Task<TurnProcessResultInfo> ProcessAsync(long userId, long campaignId, TurnProcessInfo info)
    {
        var campaign = await GetMasteredCampaignAsync(userId, campaignId);
        var characterItems = info.Characters ?? new List<TurnProcessCharacterInfo>();
        var npcItems = info.Npcs ?? new List<TurnProcessNpcInfo>();
        var narration = string.IsNullOrWhiteSpace(info.Narration) ? null : info.Narration.Trim();
        var errors = new Dictionary<string, List<string>>();
        void Error(string key, string message)
        {
            if (!errors.TryGetValue(key, out var list))
                errors[key] = list = new List<string>();
            list.Add(message);
        }

        if (characterItems.Count == 0 && npcItems.Count == 0 && narration == null)
            throw new DomainValidationException("batch", "Informe ao menos uma alteração ou a narração do turno.");
        if (characterItems.GroupBy(c => c.CharacterId).Any(g => g.Count() > 1))
            Error("batch", "O mesmo personagem aparece mais de uma vez.");
        if (npcItems.GroupBy(n => n.MapNpcId).Any(g => g.Count() > 1))
            Error("batch", "A mesma ocorrência de NPC aparece mais de uma vez.");
        if (narration?.Length > Turn.MAX_NARRATION)
            Error("narration", $"A narração deve ter no máximo {Turn.MAX_NARRATION} caracteres.");

        var mapId = campaign.CurrentMapId;
        var map = mapId is long currentMapId ? await _mapRepository.GetByIdAsync(currentMapId) : null;
        var model = map != null ? await _mapModelRepository.GetByIdAsync(map.MapModelId) : null;
        var pieces = map != null ? await _mapTokenRepository.ListByMapAsync(map.MapId) : new List<MapToken>();
        var participations = (await _campaignCharacterRepository.ListByCampaignAsync(campaignId, approvedOnly: true))
            .GroupBy(p => p.CharacterId).ToDictionary(g => g.Key, g => g.First());
        var characters = (await _characterRepository.ListByIdsAsync(characterItems.Select(c => c.CharacterId).Distinct()))
            .ToDictionary(c => c.CharacterId);
        var occurrences = map != null
            ? (await _mapNpcRepository.ListByMapAsync(map.MapId)).ToDictionary(o => o.MapNpcId)
            : new Dictionary<long, MapNpc>();
        var npcs = (await _npcRepository.ListByIdsAsync(occurrences.Values.Select(o => o.NpcId).Distinct())).ToDictionary(n => n.NpcId);

        var turns = new List<Turn>();
        var moved = new List<PieceChange>();
        var updatedParticipations = new List<CampaignCharacter>();
        var updatedOccurrences = new List<MapNpc>();

        (int X, int Y, int Look)? Target(string prefix, TurnProcessPieceInfo item, MapToken? piece)
        {
            if (item.X == null && item.Y == null && item.Look == null)
                return null;
            if (piece == null)
            {
                Error($"{prefix}.x", "Não há peça no mapa atual para mover.");
                return null;
            }
            if (item.X.HasValue != item.Y.HasValue)
            {
                Error($"{prefix}.x", "Informe x e y juntos.");
                return null;
            }
            var look = item.Look ?? piece.Look;
            if (look < 0 || look > MapToken.MAX_LOOK)
                Error($"{prefix}.look", $"O sentido deve estar entre 0 e {MapToken.MAX_LOOK}.");
            // The grid and the other pieces are checked on the final state, with the final sizes (031).
            return (item.X ?? piece.X, item.Y ?? piece.Y, look);
        }

        string? NewStatus(string prefix, TurnProcessPieceInfo item, string? current)
        {
            if (item.ClearStatus)
                return null;
            var status = item.Status == null ? current : item.Status.Trim();
            if (status?.Length > MAX_STATUS)
                Error($"{prefix}.status", $"O status deve ter no máximo {MAX_STATUS} caracteres.");
            return string.IsNullOrEmpty(status) ? null : status;
        }

        Posture NewPosture(string prefix, TurnProcessPieceInfo item, Posture current)
        {
            if (item.Posture is not int posture)
                return current;
            if (!Enum.IsDefined(typeof(Posture), posture))
            {
                Error($"{prefix}.posture", "A postura deve ser 1 (Em pé), 2 (Caído) ou 3 (Fora de combate).");
                return current;
            }
            return (Posture)posture;
        }

        void CheckVitals(string prefix, int life, int energy, int totalLife, int totalEnergy)
        {
            if (life > totalLife)
                Error($"{prefix}.currentLife", $"A vida atual não pode passar do total ({totalLife}).");
            if (energy > totalEnergy)
                Error($"{prefix}.currentEnergy", $"A fadiga atual não pode passar do total ({totalEnergy}).");
        }

        for (var i = 0; i < characterItems.Count; i++)
        {
            var item = characterItems[i];
            var prefix = $"characters[{i}]";
            if (!participations.TryGetValue(item.CharacterId, out var participation) || !characters.TryGetValue(item.CharacterId, out var character))
            {
                Error($"{prefix}.characterId", "O personagem não está aprovado nesta campanha.");
                continue;
            }
            var life = item.CurrentLife ?? participation.CurrentLife;
            var energy = item.CurrentEnergy ?? participation.CurrentEnergy;
            var status = NewStatus(prefix, item, participation.CharacterStatus);
            var posture = NewPosture(prefix, item, participation.Posture);
            var move = item.CurrentMove ?? participation.CurrentMove;
            if (move < 0)
                Error($"{prefix}.currentMove", "O deslocamento não pode ser negativo.");
            CheckVitals(prefix, life, energy, character.Life, character.Energy);
            var piece = pieces.FirstOrDefault(p => p.CampaignCharacterId == participation.CampaignCharacterId);
            var target = Target(prefix, item, piece);
            if (errors.Count > 0)
                continue;

            var changes = TurnChange.Diff(
                ("currentLife", participation.CurrentLife, life),
                ("currentEnergy", participation.CurrentEnergy, energy),
                ("currentMove", participation.CurrentMove, move),
                ("characterStatus", participation.CharacterStatus, status),
                ("posture", (int)participation.Posture, (int)posture));
            if (changes.Count > 0)
            {
                participation.UpdatePlay(life, energy, status, participation.Sheet, character.Life, character.Energy);
                participation.ChangePosture((int)posture);
                participation.ChangeMove(move);
                updatedParticipations.Add(participation);
                turns.Add(Turn.CharacterUpdate(campaignId, mapId, character.CharacterId, null, null, campaign.CurrentTurn, userId, changes));
            }
            if (target != null && piece != null && target != (piece.X, piece.Y, piece.Look))
                moved.Add(new PieceChange { Key = $"{prefix}.x", Piece = piece, Target = target });
        }

        for (var i = 0; i < npcItems.Count; i++)
        {
            var item = npcItems[i];
            var prefix = $"npcs[{i}]";
            if (!occurrences.TryGetValue(item.MapNpcId, out var occurrence))
            {
                Error($"{prefix}.mapNpcId", "A ocorrência de NPC não está no mapa atual da campanha.");
                continue;
            }
            var npc = npcs.GetValueOrDefault(occurrence.NpcId);
            var totalLife = npc?.Life ?? occurrence.CurrentLife;
            var totalEnergy = npc?.Energy ?? occurrence.CurrentEnergy;
            var life = item.CurrentLife ?? occurrence.CurrentLife;
            var energy = item.CurrentEnergy ?? occurrence.CurrentEnergy;
            var status = NewStatus(prefix, item, occurrence.Status);
            var posture = NewPosture(prefix, item, occurrence.Posture);
            CheckVitals(prefix, life, energy, totalLife, totalEnergy);
            var piece = pieces.FirstOrDefault(p => p.MapNpcId == occurrence.MapNpcId);
            var target = Target(prefix, item, piece);
            if (errors.Count > 0)
                continue;

            var changes = TurnChange.Diff(
                ("currentLife", occurrence.CurrentLife, life),
                ("currentEnergy", occurrence.CurrentEnergy, energy),
                ("status", occurrence.Status, status),
                ("posture", (int)occurrence.Posture, (int)posture));
            if (changes.Count > 0)
            {
                occurrence.Update(occurrence.Name, life, energy, status, totalLife, totalEnergy);
                occurrence.ChangePosture((int)posture);
                updatedOccurrences.Add(occurrence);
                turns.Add(Turn.CharacterUpdate(campaignId, mapId, null, occurrence.NpcId, occurrence.MapNpcId, campaign.CurrentTurn, userId, changes));
            }
            if (target != null && piece != null && target != (piece.X, piece.Y, piece.Look))
                moved.Add(new PieceChange { Key = $"{prefix}.x", Piece = piece, Target = target });
        }

        // Positions are checked on the final state, each piece with its whole shape at its final size (031): pieces may
        // swap hexes, but two can't end on the same one and no shape may leave the grid.
        Posture? PostureOf(MapToken piece) => piece.CampaignCharacterId is long cc
            ? participations.Values.FirstOrDefault(p => p.CampaignCharacterId == cc)?.Posture
            : piece.MapNpcId is long mn ? occurrences.GetValueOrDefault(mn)?.Posture : null;
        var spaces = await _occupancy.SpacesAsync(pieces, PostureOf);
        var movingIds = moved.Select(m => m.Piece!.MapTokenId).ToHashSet();
        var taken = Occupancy.Build(pieces.Where(p => !movingIds.Contains(p.MapTokenId))
            .Select(p => new PieceShape(p.MapTokenId, p.X, p.Y, p.Look, spaces[p.MapTokenId])));
        var claimed = new HashSet<(int X, int Y)>();
        foreach (var change in moved)
        {
            var (x, y, look) = change.Target!.Value;
            if (look < 0 || look > MapToken.MAX_LOOK)
                continue;
            var hexes = HexGrid.Footprint(x, y, look, spaces[change.Piece!.MapTokenId]);
            if (model != null && hexes.Any(h => !HexGrid.IsInsideGrid(h.X, h.Y, model.GridWidth, model.GridHeight)))
                Error(change.Key, "A peça não cabe na grid do mapa nessa posição.");
            else if (hexes.Any(h => taken.IsBlocked(h.X, h.Y, change.Piece.MapTokenId) || claimed.Contains(h)))
                Error(change.Key, $"O hex ({x}, {y}) já está ocupado.");
            claimed.UnionWith(hexes);
        }

        if (errors.Count > 0)
            throw new DomainValidationException(errors.ToDictionary(e => e.Key, e => e.Value.ToArray()));

        foreach (var change in moved)
        {
            var piece = change.Piece!;
            var (x, y, look) = change.Target!.Value;
            var cost = HexGrid.MovementCost(piece.X, piece.Y, piece.Look, x, y, look,
                model?.GridWidth ?? int.MaxValue, model?.GridHeight ?? int.MaxValue, (_, _) => false, spaces[piece.MapTokenId]);
            long? characterId = piece.CampaignCharacterId is long cc
                ? participations.Values.FirstOrDefault(p => p.CampaignCharacterId == cc)?.CharacterId : null;
            long? npcId = piece.MapNpcId is long mn ? occurrences.GetValueOrDefault(mn)?.NpcId : null;
            turns.Add(Turn.Movement(campaignId, mapId, characterId, characterId.HasValue ? null : npcId,
                characterId.HasValue ? null : piece.MapNpcId, campaign.CurrentTurn, userId,
                (piece.X, piece.Y, piece.Look), (x, y, look), cost));
            piece.MoveTo(x, y);
            piece.Face(look);
        }
        if (narration != null)
            turns.Add(Turn.Narration(campaignId, mapId, campaign.CurrentTurn, userId, narration));

        var finished = campaign.CurrentTurn;
        campaign.AdvanceTurn();
        // The chat shows where the turn ended, after its narration (041).
        turns.Add(Turn.TurnFinished(campaignId, mapId, finished, userId));
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            foreach (var participation in updatedParticipations)
                await _campaignCharacterRepository.UpdateAsync(participation);
            foreach (var occurrence in updatedOccurrences)
                await _mapNpcRepository.UpdateAsync(occurrence);
            foreach (var change in moved)
                await _mapTokenRepository.UpdateAsync(change.Piece!);
            foreach (var turn in turns)
                await _repository.InsertAsync(turn);
            await _campaignRepository.UpdateAsync(campaign);
        });

        await _notifier.PublishAsync(TableEvents.Create(TableEventType.PARTY_CHANGED, campaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, campaignId, userId));
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_FINISHED, campaignId, userId,
            data: new { finishedTurn = finished, turnNo = campaign.CurrentTurn }));
        // 043: the narration to everyone, each owner's PV/Fadiga, and the end of the turn to the players.
        if (narration != null)
            _queue.Enqueue(TableNotices.Narration(campaignId, userId, narration));
        foreach (var update in turns.Where(t => t.TurnType == TurnType.CharacterUpdate && t.CharacterId.HasValue && t.Changes != null))
            await NotifyVitalsAsync(campaignId, userId, update.CharacterId!.Value, update.Changes!);
        await NotifyTurnFinishedAsync(campaign, userId, finished);

        return new TurnProcessResultInfo
        {
            FinishedTurn = finished,
            TurnNo = campaign.CurrentTurn,
            Data = await BuildDataAsync(campaign, finished)
        };
    }

    // ------------------------------------------------------------------ history (028)

    public const int DEFAULT_HISTORY_LIMIT = 5;
    public const int MAX_HISTORY_LIMIT = 20;

    /// <summary>
    /// A page of turns, newest first: the turn in progress and the finished ones below it, each with the "## Ações"
    /// text of its summary. The story of a campaign is told while its turn is still open, so the turn being played
    /// belongs to the console. The cursor is the turn number, so turns finished meanwhile never shift the pages.
    /// </summary>
    public async Task<TurnHistoryPageInfo> GetHistoryAsync(long userId, long campaignId, int? before, int? limit)
    {
        var campaign = await GetReadableCampaignAsync(userId, campaignId);
        if (before < 1)
            throw new DomainValidationException("before", "O turno deve ser maior que zero.");
        var size = Math.Clamp(limit ?? DEFAULT_HISTORY_LIMIT, 1, MAX_HISTORY_LIMIT);
        // `before` keeps meaning "only turns below it"; without it the page starts at the turn in progress.
        var newest = before.HasValue ? Math.Min(before.Value - 1, campaign.CurrentTurn) : campaign.CurrentTurn;
        var page = new TurnHistoryPageInfo { CampaignId = campaignId, CurrentTurn = campaign.CurrentTurn };
        if (newest < 1)
            return page;

        var oldest = Math.Max(1, newest - size + 1);
        var entries = await _repository.ListByCampaignTurnRangeAsync(campaignId, oldest, newest);
        var names = await LoadNamesAsync(campaign, entries, Array.Empty<long>(), Array.Empty<long>());

        // One item per narration, newest first: a turn commonly holds several (the master narrates more than once
        // before closing it), and each one is a block of the console. `limit` bounds the range of turns read, not the
        // items returned — a page can hold more or fewer, since a turn without narration yields none. Moves, speech,
        // action results and character changes stay in the full summary (get_turn_summary) and in the turn log.
        foreach (var entry in entries.Where(e => e.TurnType == TurnType.Narration)
                     .OrderByDescending(e => e.TurnNo).ThenByDescending(e => e.TurnId))
            page.Items.Add(new TurnHistoryItemInfo
            {
                TurnId = entry.TurnId,
                TurnNo = entry.TurnNo,
                Actions = TurnSummary.BuildNarration(names.AuthorLabel(entry), entry.Description),
                FinishedAt = entry.CreatedAt
            });

        page.NextBefore = oldest > 1 ? oldest : null;
        return page;
    }
}
