using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Models;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// The grid size and the hexes taken on a map (031): every piece with its current size, plus the walls of a story map
/// (033).
/// </summary>
public sealed class MapLayout
{
    public required Occupancy Occupancy { get; init; }
    public required int Columns { get; init; }
    public required int Rows { get; init; }

    /// <summary>Hexes taken now by each piece (map token id → size).</summary>
    public required IReadOnlyDictionary<long, int> Spaces { get; init; }

    public int SpaceOf(MapToken piece) => Spaces.GetValueOrDefault(piece.MapTokenId, Token.DEFAULT_UP_SPACE);

    /// <summary>
    /// Cheapest movement cost of a piece around the others, or ignoring them (the master jumping over pieces). Walls of
    /// a story map always block, even for the master (033).
    /// </summary>
    public int? MovementCost(MapToken piece, int x, int y, int look, bool ignorePieces = false) =>
        HexGrid.MovementCost(piece.X, piece.Y, piece.Look, x, y, look, Columns, Rows,
            ignorePieces ? (hx, hy) => Occupancy.IsWall(hx, hy) : (hx, hy) => Occupancy.IsBlocked(hx, hy, piece.MapTokenId),
            SpaceOf(piece));

    /// <summary>
    /// The whole shape must be inside the grid (400 on x), on no wall of a story map (409, 033) and on hexes no other
    /// piece takes (409). Changing the posture never calls this: lying down over another piece is allowed until the
    /// piece moves (031 Q2).
    /// </summary>
    public void EnsureFits(int x, int y, int look, int space, long? exceptMapTokenId)
    {
        switch (Occupancy.Fits(HexGrid.Footprint(x, y, look, space), Columns, Rows, exceptMapTokenId))
        {
            case FitResult.OutsideGrid:
                throw new DomainValidationException("x", space == 1
                    ? "A posição está fora da grid do mapa."
                    : "A peça não cabe na grid do mapa nessa posição.");
            case FitResult.Wall:
                throw new ConflictException(MapLayout.WALL_MESSAGE);
            case FitResult.Occupied:
                throw new ConflictException("O hex já está ocupado.");
        }
    }

    public const string WALL_MESSAGE = "Há uma parede nessa posição.";
}

/// <summary>
/// Loads a <see cref="MapLayout"/>: the pieces of a map, their tokens and the postures of the characters/NPC
/// occurrences they show, in batch. Created by the services that place or move pieces from repositories they already
/// have (no DI registration).
/// </summary>
public sealed class MapOccupancyLoader
{
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IMapNpcRepository<MapNpc> _mapNpcRepository;

    public MapOccupancyLoader(
        IMapModelRepository<MapModel> mapModelRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        ITokenRepository<Token> tokenRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IMapNpcRepository<MapNpc> mapNpcRepository)
    {
        _mapModelRepository = mapModelRepository;
        _mapTokenRepository = mapTokenRepository;
        _tokenRepository = tokenRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _mapNpcRepository = mapNpcRepository;
    }

    /// <summary>Hexes taken by a piece of this token in this posture (objects: null posture).</summary>
    public static int PieceSpace(Token? token, Posture? posture) => token?.SpaceFor(posture) ?? Token.DEFAULT_UP_SPACE;

    public async Task<MapLayout> LoadAsync(Map map)
    {
        var model = await _mapModelRepository.GetByIdAsync(map.MapModelId);
        var pieces = await _mapTokenRepository.ListByMapAsync(map.MapId) ?? new List<MapToken>();
        var spaces = await SpacesAsync(pieces);
        return new MapLayout
        {
            Occupancy = Occupancy.Build(pieces.Select(p => new PieceShape(p.MapTokenId, p.X, p.Y, p.Look, spaces[p.MapTokenId])),
                model?.ActiveWalls()),
            Columns = model?.GridWidth ?? int.MaxValue,
            Rows = model?.GridHeight ?? int.MaxValue,
            Spaces = spaces
        };
    }

    /// <summary>Current size of each piece: its token's size for the posture of the character/NPC it shows.</summary>
    public async Task<Dictionary<long, int>> SpacesAsync(IReadOnlyCollection<MapToken> pieces)
    {
        if (pieces.Count == 0)
            return new Dictionary<long, int>();
        var postures = await PosturesAsync(pieces);
        return await SpacesAsync(pieces, p => postures.GetValueOrDefault(p.MapTokenId));
    }

    /// <summary>Size of each piece for the given postures (e.g. the final ones of a batch not saved yet).</summary>
    public async Task<Dictionary<long, int>> SpacesAsync(IReadOnlyCollection<MapToken> pieces, Func<MapToken, Posture?> postureOf)
    {
        if (pieces.Count == 0)
            return new Dictionary<long, int>();
        var tokens = (await _tokenRepository.ListByIdsAsync(pieces.Select(p => p.TokenId).Distinct()) ?? new List<Token>())
            .ToDictionary(t => t.TokenId);
        return pieces.ToDictionary(p => p.MapTokenId, p => PieceSpace(tokens.GetValueOrDefault(p.TokenId), postureOf(p)));
    }

    /// <summary>Size of a piece that is about to be placed with this token and posture.</summary>
    public async Task<int> SpaceOfTokenAsync(long tokenId, Posture? posture) =>
        PieceSpace(await _tokenRepository.GetByIdAsync(tokenId), posture);

    private async Task<Dictionary<long, Posture?>> PosturesAsync(IReadOnlyCollection<MapToken> pieces)
    {
        var result = new Dictionary<long, Posture?>();
        var participationIds = pieces.Where(p => p.CampaignCharacterId.HasValue).Select(p => p.CampaignCharacterId!.Value).Distinct().ToList();
        var occurrenceIds = pieces.Where(p => p.MapNpcId.HasValue).Select(p => p.MapNpcId!.Value).Distinct().ToList();
        var participations = participationIds.Count == 0 ? new Dictionary<long, CampaignCharacter>()
            : (await _campaignCharacterRepository.ListByIdsAsync(participationIds) ?? new List<CampaignCharacter>()).ToDictionary(c => c.CampaignCharacterId);
        var occurrences = occurrenceIds.Count == 0 ? new Dictionary<long, MapNpc>()
            : (await _mapNpcRepository.ListByIdsAsync(occurrenceIds) ?? new List<MapNpc>()).ToDictionary(o => o.MapNpcId);
        foreach (var piece in pieces)
        {
            if (piece.CampaignCharacterId is long participationId)
                result[piece.MapTokenId] = participations.GetValueOrDefault(participationId)?.Posture;
            else if (piece.MapNpcId is long occurrenceId)
                result[piece.MapTokenId] = occurrences.GetValueOrDefault(occurrenceId)?.Posture;
        }
        return result;
    }
}
