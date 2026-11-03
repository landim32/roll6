using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Maps;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.Map;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// Paint of a campaign map (107): one mark per hex (terrain or a "Marcação" with text) and free drawings, both on the
/// campaign map (never the model). Marks are informative only — no movement, occupancy or turn rule reads them.
/// Marks outside the current grid (after the model shrank) stay stored but are left out of every read.
/// </summary>
public class MapPaintService : IMapPaintService
{
    public const string MASTER_ONLY = "Apenas o mestre pinta o mapa.";
    public const string READERS_ONLY = "Apenas o mestre ou participantes aprovados podem ver a pintura do mapa.";
    public const string MAP_NOT_FOUND = "Mapa não encontrado.";
    public const string DRAWING_NOT_FOUND = "Desenho não encontrado.";
    public static readonly string TOO_MANY_DRAWINGS = $"O mapa já tem o máximo de {MapDrawing.MAX_PER_MAP} desenhos.";

    private readonly IMapPaintRepository<MapHexMark, MapDrawing> _repository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly ICharacterRepository<Character> _characterRepository;
    private readonly IMapNpcRepository<MapNpc> _mapNpcRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _time;
    private readonly IRealtimeNotifier _notifier;
    private readonly MapOccupancyLoader _occupancy;

    public MapPaintService(
        IMapPaintRepository<MapHexMark, MapDrawing> repository,
        IMapRepository<Map> mapRepository,
        IMapModelRepository<MapModel> mapModelRepository,
        ICampaignRepository<Campaign> campaignRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        ITokenRepository<Token> tokenRepository,
        ICharacterRepository<Character> characterRepository,
        IMapNpcRepository<MapNpc> mapNpcRepository,
        IUnitOfWork unitOfWork,
        TimeProvider time,
        IRealtimeNotifier notifier)
    {
        _repository = repository;
        _mapRepository = mapRepository;
        _mapModelRepository = mapModelRepository;
        _campaignRepository = campaignRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _mapTokenRepository = mapTokenRepository;
        _characterRepository = characterRepository;
        _mapNpcRepository = mapNpcRepository;
        _unitOfWork = unitOfWork;
        _time = time;
        _notifier = notifier;
        _occupancy = new MapOccupancyLoader(mapModelRepository, mapTokenRepository, tokenRepository, campaignCharacterRepository, mapNpcRepository);
    }

    public async Task<MapPaintInfo> GetPaintAsync(long userId, long mapId)
    {
        var map = await GetMapAsync(mapId);
        await EnsureReaderAsync(userId, map);
        var (columns, rows) = await GridOfAsync(map);
        var marks = await _repository.ListMarksAsync(map.MapId);
        var drawings = await _repository.ListDrawingsAsync(map.MapId);
        return new MapPaintInfo
        {
            MapId = map.MapId,
            Marks = marks.Where(m => HexGrid.IsInsideGrid(m.X, m.Y, columns, rows)).Select(MarkToDto).ToList(),
            Drawings = drawings.OrderBy(d => d.MapDrawingId).Select(DrawingToDto).ToList()
        };
    }

    public async Task<MapPaintChangeInfo> SetHexMarksAsync(long userId, long mapId, MapHexMarksInfo info)
    {
        var map = await EnsureMasterWriteAsync(userId, mapId);
        var (columns, rows) = await GridOfAsync(map);
        var batch = HexMarkSet.Parse(info?.Marks, columns, rows);
        var now = Now();

        var existing = (await _repository.ListMarksAsync(map.MapId)).ToDictionary(m => (m.X, m.Y));
        var upserts = batch.Upserts
            .Select(u => MapHexMark.Create(map.MapId, u.X, u.Y, u.Kind, u.Text, userId, now))
            .ToList();
        var changed = upserts.Where(u => !existing.TryGetValue((u.X, u.Y), out var old) || !old.SameAs(u)).ToList();
        var removals = batch.Removals.Where(existing.ContainsKey).ToList();

        var result = new MapPaintChangeInfo
        {
            MapId = map.MapId,
            Marks = upserts.Select(MarkToDto).ToList(),
            RemovedHexes = removals.Select(r => new HexCoordInfo { X = r.X, Y = r.Y }).ToList()
        };
        if (changed.Count == 0 && removals.Count == 0)
            return result;

        await _unitOfWork.ExecuteInTransactionAsync(() => _repository.ApplyMarksAsync(map.MapId, changed, removals));
        await PublishAsync(map, userId, result);
        return result;
    }

    public async Task<MapDrawingInfo> AddDrawingAsync(long userId, long mapId, MapDrawingInsertInfo info)
    {
        var map = await EnsureMasterWriteAsync(userId, mapId);
        if (info == null)
            throw new DomainValidationException("kind", DrawingShape.UNKNOWN_KIND);
        var (columns, rows) = await GridOfAsync(map);
        var drawing = MapDrawing.Create(map.MapId, info.Kind, info.Points, info.Color, info.Width, info.Opacity,
            columns, rows, userId, Now());
        if (await _repository.CountDrawingsAsync(map.MapId) >= MapDrawing.MAX_PER_MAP)
            throw new ConflictException(TOO_MANY_DRAWINGS);

        var result = DrawingToDto(await _repository.InsertDrawingAsync(drawing));
        await PublishAsync(map, userId, new MapPaintChangeInfo { MapId = map.MapId, Drawing = result });
        return result;
    }

    public async Task DeleteDrawingAsync(long userId, long mapId, long mapDrawingId)
    {
        var map = await EnsureMasterWriteAsync(userId, mapId);
        var drawing = await _repository.GetDrawingAsync(mapDrawingId);
        if (drawing == null || drawing.MapId != map.MapId)
            throw new KeyNotFoundException(DRAWING_NOT_FOUND);

        await _repository.DeleteDrawingAsync(mapDrawingId);
        await PublishAsync(map, userId, new MapPaintChangeInfo { MapId = map.MapId, DeletedDrawingId = mapDrawingId });
    }

    public async Task ClearAsync(long userId, long mapId)
    {
        var map = await EnsureMasterWriteAsync(userId, mapId);
        var removed = 0;
        await _unitOfWork.ExecuteInTransactionAsync(async () => removed = await _repository.ClearAsync(map.MapId));
        if (removed > 0)
            await PublishAsync(map, userId, new MapPaintChangeInfo { MapId = map.MapId, Cleared = true });
    }

    public async Task<HexContentInfo> GetHexContentAsync(long userId, long mapId, int x, int y)
    {
        var map = await GetMapAsync(mapId);
        await EnsureReaderAsync(userId, map);
        var (columns, rows) = await GridOfAsync(map);
        if (!HexGrid.IsInsideGrid(x, y, columns, rows))
            throw new DomainValidationException("x", HexMarkSet.OUTSIDE);

        var mark = await _repository.GetMarkAsync(map.MapId, x, y);
        return new HexContentInfo
        {
            MapId = map.MapId,
            X = x,
            Y = y,
            Inside = true,
            Mark = mark == null ? null : MarkToDto(mark),
            Pieces = await PiecesAtAsync(map, x, y)
        };
    }

    /// <summary>
    /// Every piece whose shape covers the hex (031 sizes and postures, <see cref="Occupancy.PiecesAt"/>), with the name
    /// it shows: the character's, the NPC instance's or the object's own.
    /// </summary>
    private async Task<List<HexPieceInfo>> PiecesAtAsync(Map map, int x, int y)
    {
        var pieces = await _mapTokenRepository.ListByMapAsync(map.MapId) ?? new List<MapToken>();
        if (pieces.Count == 0)
            return new List<HexPieceInfo>();

        var participationIds = pieces.Where(p => p.CampaignCharacterId.HasValue).Select(p => p.CampaignCharacterId!.Value).Distinct().ToList();
        var occurrenceIds = pieces.Where(p => p.MapNpcId.HasValue).Select(p => p.MapNpcId!.Value).Distinct().ToList();
        var participations = participationIds.Count == 0 ? new Dictionary<long, CampaignCharacter>()
            : (await _campaignCharacterRepository.ListByIdsAsync(participationIds) ?? new List<CampaignCharacter>())
                .ToDictionary(c => c.CampaignCharacterId);
        var occurrences = occurrenceIds.Count == 0 ? new Dictionary<long, MapNpc>()
            : (await _mapNpcRepository.ListByIdsAsync(occurrenceIds) ?? new List<MapNpc>()).ToDictionary(o => o.MapNpcId);

        Posture? PostureOf(MapToken piece) =>
            piece.CampaignCharacterId is long participationId ? participations.GetValueOrDefault(participationId)?.Posture
            : piece.MapNpcId is long occurrenceId ? occurrences.GetValueOrDefault(occurrenceId)?.Posture
            : null;

        var spaces = await _occupancy.SpacesAsync(pieces, PostureOf);
        var occupancy = Occupancy.Build(pieces.Select(p => new PieceShape(p.MapTokenId, p.X, p.Y, p.Look, spaces[p.MapTokenId])));
        var covering = occupancy.PiecesAt(x, y).ToHashSet();
        var found = pieces.Where(p => covering.Contains(p.MapTokenId)).OrderBy(p => p.MapTokenId).ToList();
        if (found.Count == 0)
            return new List<HexPieceInfo>();

        var characterIds = found
            .Select(p => p.CampaignCharacterId is long id ? participations.GetValueOrDefault(id)?.CharacterId : null)
            .OfType<long>().Distinct().ToList();
        var characters = characterIds.Count == 0 ? new Dictionary<long, Character>()
            : (await _characterRepository.ListByIdsAsync(characterIds) ?? new List<Character>()).ToDictionary(c => c.CharacterId);

        return found.Select(piece =>
        {
            var info = new HexPieceInfo
            {
                MapTokenId = piece.MapTokenId,
                Name = piece.Name,
                TokenType = (int)piece.TokenType,
                CampaignCharacterId = piece.CampaignCharacterId,
                MapNpcId = piece.MapNpcId,
                Posture = PostureOf(piece) is Posture posture ? (int)posture : null,
                X = piece.X,
                Y = piece.Y
            };
            if (piece.CampaignCharacterId is long participationId && participations.TryGetValue(participationId, out var participation))
            {
                info.CharacterId = participation.CharacterId;
                info.Name = characters.GetValueOrDefault(participation.CharacterId)?.Name ?? piece.Name;
            }
            if (piece.MapNpcId is long occurrenceId && occurrences.TryGetValue(occurrenceId, out var occurrence))
                info.Name = occurrence.Name;
            return info;
        }).ToList();
    }

    private DateTime Now() => _time.GetUtcNow().UtcDateTime;

    private Task PublishAsync(Map map, long userId, MapPaintChangeInfo change) =>
        _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_PAINT_CHANGED, map.CampaignId, userId, map.MapId, change));

    /// <summary>The map, when it exists and is not deleted (404 otherwise).</summary>
    private async Task<Map> GetMapAsync(long mapId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException(MAP_NOT_FOUND);
        map.EnsureNotDeleted();
        return map;
    }

    private async Task<Campaign> GetCampaignAsync(Map map) =>
        await _campaignRepository.GetByIdAsync(map.CampaignId)
            ?? throw new KeyNotFoundException("Campanha não encontrada.");

    /// <summary>Master or owner of an approved character, in any campaign status and for archived maps too.</summary>
    private async Task EnsureReaderAsync(long userId, Map map)
    {
        var campaign = await GetCampaignAsync(map);
        if (campaign.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(campaign.CampaignId, userId))
            throw new UnauthorizedAccessException(READERS_ONLY);
    }

    /// <summary>Only the campaign's master paints, and only while its maps may change (049: Active, or Preparing).</summary>
    private async Task<Map> EnsureMasterWriteAsync(long userId, long mapId)
    {
        var map = await GetMapAsync(mapId);
        var campaign = await GetCampaignAsync(map);
        if (campaign.UserId != userId)
            throw new UnauthorizedAccessException(MASTER_ONLY);
        campaign.EnsureMapEditable(true);
        return map;
    }

    private async Task<(int Columns, int Rows)> GridOfAsync(Map map)
    {
        var model = await _mapModelRepository.GetByIdAsync(map.MapModelId)
            ?? throw new KeyNotFoundException("Modelo de mapa não encontrado.");
        return (model.GridWidth, model.GridHeight);
    }

    private static MapHexMarkInfo MarkToDto(MapHexMark mark) => new()
    {
        X = mark.X,
        Y = mark.Y,
        Kind = (int)mark.Kind,
        Text = mark.Kind == HexMarkKind.Mark ? mark.Text : null
    };

    private static MapDrawingInfo DrawingToDto(MapDrawing drawing) => new()
    {
        MapDrawingId = drawing.MapDrawingId,
        Kind = (int)drawing.Kind,
        Points = drawing.Points.Select(p => new[] { p[0], p[1] }).ToList(),
        Color = drawing.Color,
        Width = drawing.Width,
        Opacity = Math.Round(drawing.Opacity, 3),
        UserId = drawing.UserId,
        CreatedAt = drawing.CreatedAt
    };
}
