using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.MapNpc;
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
    private readonly IImageStorageAppService _imageStorage;

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
        IImageStorageAppService imageStorage)
    {
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
    }

    public async Task<List<MapNpcInfo>> ListByMapAsync(long userId, long mapId)
    {
        var map = await GetMapAsync(mapId);
        if (map.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(map.CampaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os NPCs do mapa.");
        return await MapToDtoAsync(await _repository.ListByMapAsync(mapId));
    }

    /// <summary>New occurrence of a campaign NPC with its piece on a free hex inside the grid (one transaction).</summary>
    public async Task<MapNpcInfo> CreateAsync(long userId, MapNpcInsertInfo info)
    {
        var map = await GetMasteredMapAsync(userId, info.MapId);
        var npc = await _npcRepository.GetByIdAsync(info.NpcId)
            ?? throw new KeyNotFoundException("NPC não encontrado.");
        if (await _campaignNpcRepository.GetAsync(map.CampaignId, npc.NpcId) == null)
            throw new ConflictException("O NPC não está na campanha deste mapa.");

        var model = await _mapModelRepository.GetByIdAsync(map.MapModelId);
        if (model != null && !HexGrid.IsInsideGrid(info.X, info.Y, model.GridWidth, model.GridHeight))
            throw new DomainValidationException("x", "A posição está fora da grid do mapa.");
        if (await _mapTokenRepository.ExistsAtAsync(map.MapId, info.X, info.Y, null))
            throw new ConflictException("O hex já está ocupado.");

        MapNpc saved = null!;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            saved = await _repository.InsertAsync(MapNpc.FromNpc(map.MapId, npc));
            await _mapTokenRepository.InsertAsync(MapToken.PlaceNpc(map.MapId, npc.TokenId, saved.MapNpcId, saved.Name, info.X, info.Y, info.Look));
        });
        return (await MapToDtoAsync(new List<MapNpc> { saved })).Single();
    }

    public async Task<MapNpcInfo> UpdateAsync(long userId, long mapNpcId, MapNpcUpdateInfo info)
    {
        var mapNpc = await GetOwnedAsync(userId, mapNpcId);
        mapNpc.Update(info.Name, info.Life, info.Energy, info.Status);
        return (await MapToDtoAsync(new List<MapNpc> { await _repository.UpdateAsync(mapNpc) })).Single();
    }

    /// <summary>Removes the occurrence and its piece.</summary>
    public async Task DeleteAsync(long userId, long mapNpcId)
    {
        var mapNpc = await GetOwnedAsync(userId, mapNpcId);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _mapTokenRepository.DeleteByMapNpcIdsAsync(new[] { mapNpc.MapNpcId });
            await _repository.DeleteAsync(mapNpc.MapNpcId);
        });
    }

    private async Task<MapNpc> GetOwnedAsync(long userId, long mapNpcId)
    {
        var mapNpc = await _repository.GetByIdAsync(mapNpcId)
            ?? throw new KeyNotFoundException("NPC do mapa não encontrado.");
        await GetMasteredMapAsync(userId, mapNpc.MapId);
        return mapNpc;
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

        return mapNpcs.Select(m =>
        {
            var piece = pieces.GetValueOrDefault(m.MapNpcId);
            var token = piece != null ? tokens.GetValueOrDefault(piece.TokenId) : null;
            return new MapNpcInfo
            {
                MapNpcId = m.MapNpcId,
                MapId = m.MapId,
                NpcId = m.NpcId,
                MapTokenId = piece?.MapTokenId,
                Name = m.Name,
                Life = m.Life,
                Energy = m.Energy,
                Status = m.Status,
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
