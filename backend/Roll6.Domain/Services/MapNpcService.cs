using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Realtime;
using Roll6.DTO.MapNpc;
using Roll6.DTO.Realtime;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// NPC occurrences on campaign maps. Each occurrence is shown by one map piece (Npc type, the NPC's token)
/// created and removed together with it. Only the master writes; the master and approved participants read.
/// </summary>
public class MapNpcService : IMapNpcService
{
    private readonly IMapNpcRepository<MapNpc> _repository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly INpcRepository<Npc> _npcRepository;
    private readonly ICampaignNpcRepository<CampaignNpc> _campaignNpcRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ITurnRepository<Turn> _turnRepository;
    private readonly ICampaignRepository<Campaign> _campaignRepository;
    private readonly IImageStorageAppService _imageStorage;

    private readonly IRealtimeNotifier _notifier;

    public MapNpcService(
        IMapNpcRepository<MapNpc> repository,
        IMapRepository<Map> mapRepository,
        IMapModelRepository<MapModel> mapModelRepository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        INpcRepository<Npc> npcRepository,
        ICampaignNpcRepository<CampaignNpc> campaignNpcRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        ITokenRepository<Token> tokenRepository,
        IUnitOfWork unitOfWork,
        IImageStorageAppService imageStorage,
        ITurnRepository<Turn> turnRepository,
        ICampaignRepository<Campaign> campaignRepository,
        IRealtimeNotifier notifier)
    {
        _notifier = notifier;
        _campaignRepository = campaignRepository;
        _turnRepository = turnRepository;
        _repository = repository;
        _mapRepository = mapRepository;
        _mapModelRepository = mapModelRepository;
        _mapTokenRepository = mapTokenRepository;
        _npcRepository = npcRepository;
        _campaignNpcRepository = campaignNpcRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _tokenRepository = tokenRepository;
        _unitOfWork = unitOfWork;
        _imageStorage = imageStorage;
        _occupancy = new MapOccupancyLoader(mapModelRepository, mapTokenRepository, tokenRepository, campaignCharacterRepository, repository);
    }

    private readonly MapOccupancyLoader _occupancy;

    public async Task<List<MapNpcInfo>> ListByMapAsync(long userId, long mapId)
    {
        var map = await GetMapAsync(mapId);
        if (map.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(map.CampaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os NPCs do mapa.");
        return await MapToDtoAsync(await _repository.ListByMapAsync(mapId));
    }

    /// <summary>
    /// New occurrence of a campaign NPC with its piece (one transaction); the whole shape of the NPC's token (standing)
    /// must be inside the grid and on free hexes (031).
    /// </summary>
    public async Task<MapNpcInfo> CreateAsync(long userId, MapNpcInsertInfo info)
    {
        var map = await GetMasteredMapAsync(userId, info.MapId);
        var npc = await _npcRepository.GetByIdAsync(info.NpcId)
            ?? throw new KeyNotFoundException("NPC não encontrado.");
        if (await _campaignNpcRepository.GetAsync(map.CampaignId, npc.NpcId) == null)
            throw new ConflictException("O NPC não está na campanha deste mapa.");

        (await _occupancy.LoadAsync(map)).EnsureFits(info.X, info.Y, info.Look ?? 0,
            await _occupancy.SpaceOfTokenAsync(npc.TokenId, npc.Posture), null);

        MapNpc saved = null!;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            saved = await _repository.InsertAsync(MapNpc.FromNpc(map.MapId, npc));
            await _mapTokenRepository.InsertAsync(MapToken.PlaceNpc(map.MapId, npc.TokenId, saved.MapNpcId, saved.Name, info.X, info.Y, info.Look));
        });
        await PublishPiecesChangedAsync(map, userId);
        return (await MapToDtoAsync(new List<MapNpc> { saved })).Single();
    }

    public async Task<MapNpcInfo> UpdateAsync(long userId, long mapNpcId, MapNpcUpdateInfo info)
    {
        var (mapNpc, map) = await GetOwnedAsync(userId, mapNpcId);
        var before = (mapNpc.Name, mapNpc.CurrentLife, mapNpc.CurrentEnergy, mapNpc.Status, mapNpc.Posture);
        var npc = await _npcRepository.GetByIdAsync(mapNpc.NpcId)
            ?? throw new KeyNotFoundException("NPC não encontrado.");
        mapNpc.Update(info.Name, info.CurrentLife, info.CurrentEnergy, info.Status, npc.Life, npc.Energy);
        if (info.Posture is int posture)
            mapNpc.ChangePosture(posture);

        // Every change during the turn is recorded with who made it (024).
        var changes = TurnChange.Diff(
            ("name", before.Name, mapNpc.Name),
            ("currentLife", before.CurrentLife, mapNpc.CurrentLife),
            ("currentEnergy", before.CurrentEnergy, mapNpc.CurrentEnergy),
            ("status", before.Status, mapNpc.Status),
            ("posture", (int)before.Posture, (int)mapNpc.Posture));
        Turn? turn = null;
        if (changes.Count > 0)
        {
            var campaign = await _campaignRepository.GetByIdAsync(map.CampaignId)
                ?? throw new KeyNotFoundException("Campanha não encontrada.");
            turn = Turn.CharacterUpdate(campaign.CampaignId, map.MapId, null, mapNpc.NpcId, mapNpc.MapNpcId, campaign.CurrentTurn, userId, changes);
        }

        MapNpc saved = mapNpc;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            saved = await _repository.UpdateAsync(mapNpc);
            if (turn != null)
                await _turnRepository.InsertAsync(turn);
        });
        var result = (await MapToDtoAsync(new List<MapNpc> { saved })).Single();
        await PublishPiecesChangedAsync(map, userId);
        if (turn != null)
            await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, map.CampaignId, userId));
        return result;
    }

    /// <summary>Removes the occurrence and its piece.</summary>
    public async Task DeleteAsync(long userId, long mapNpcId)
    {
        var (mapNpc, map) = await GetOwnedAsync(userId, mapNpcId);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mapTokenRepository.DeleteByMapNpcIdsAsync(new[] { mapNpc.MapNpcId });
            await _turnRepository.DeleteByMapNpcIdsAsync(new[] { mapNpc.MapNpcId });
            await _repository.DeleteAsync(mapNpc.MapNpcId);
        });
        await PublishPiecesChangedAsync(map, userId);
        await _notifier.PublishAsync(TableEvents.Create(TableEventType.TURN_CHANGED, map.CampaignId, userId));
    }

    /// <summary>The occurrence's piece shows its name/vitals: the map's pieces must be reloaded (017).</summary>
    private Task PublishPiecesChangedAsync(Map map, long userId) =>
        _notifier.PublishAsync(TableEvents.Create(TableEventType.MAP_TOKENS_CHANGED, map.CampaignId, userId, map.MapId));

    private async Task<(MapNpc MapNpc, Map Map)> GetOwnedAsync(long userId, long mapNpcId)
    {
        var mapNpc = await _repository.GetByIdAsync(mapNpcId)
            ?? throw new KeyNotFoundException("NPC do mapa não encontrado.");
        return (mapNpc, await GetMasteredMapAsync(userId, mapNpc.MapId));
    }

    private async Task<Map> GetMapAsync(long mapId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        return map;
    }

    private async Task<Map> GetMasteredMapAsync(long userId, long mapId)
    {
        var map = await GetMapAsync(mapId);
        if (map.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o mestre da campanha pode gerenciar os NPCs do mapa.");
        return map;
    }

    /// <summary>Loads the pieces (position), NPCs and tokens in batch.</summary>
    private async Task<List<MapNpcInfo>> MapToDtoAsync(List<MapNpc> mapNpcs)
    {
        if (mapNpcs.Count == 0)
            return new List<MapNpcInfo>();

        var pieces = (await _mapTokenRepository.ListByMapNpcIdsAsync(mapNpcs.Select(m => m.MapNpcId)))
            .Where(p => p.MapNpcId.HasValue)
            .ToDictionary(p => p.MapNpcId!.Value);
        var tokens = (await _tokenRepository.ListByIdsAsync(pieces.Values.Select(p => p.TokenId).Distinct())).ToDictionary(t => t.TokenId);
        // Totals are the NPC's (026).
        var npcs = (await _npcRepository.ListByIdsAsync(mapNpcs.Select(m => m.NpcId).Distinct())).ToDictionary(n => n.NpcId);

        return mapNpcs.Select(m =>
        {
            var piece = pieces.GetValueOrDefault(m.MapNpcId);
            var token = piece != null ? tokens.GetValueOrDefault(piece.TokenId) : null;
            var npc = npcs.GetValueOrDefault(m.NpcId);
            return new MapNpcInfo
            {
                MapNpcId = m.MapNpcId,
                MapId = m.MapId,
                NpcId = m.NpcId,
                MapTokenId = piece?.MapTokenId,
                Name = m.Name,
                CurrentLife = m.CurrentLife,
                CurrentEnergy = m.CurrentEnergy,
                TotalLife = npc?.Life ?? m.CurrentLife,
                TotalEnergy = npc?.Energy ?? m.CurrentEnergy,
                Status = m.Status,
                Posture = (int)m.Posture,
                TokenId = piece?.TokenId,
                TokenImageUrl = _imageStorage.GetUrl(token?.UpImage),
                X = piece?.X,
                Y = piece?.Y,
                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt
            };
        }).ToList();
    }
}
