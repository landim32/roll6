using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.MapToken;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// Pieces on a campaign map. Only the map owner (the campaign master) writes; the master and approved
/// participants read. A hex holds at most one piece; a character appears at most once per map and its
/// piece shows the participation's name, vitals, status and sheet.
/// </summary>
public class MapTokenService : IMapTokenService
{
    private readonly IMapTokenRepository<MapToken> _repository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly IMapModelRepository<MapModel> _mapModelRepository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly ICharacterRepository<Character> _characterRepository;
    private readonly IMapNpcRepository<MapNpc> _mapNpcRepository;
    private readonly INpcRepository<Npc> _npcRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IImageStorageAppService _imageStorage;

    public MapTokenService(
        IMapTokenRepository<MapToken> repository,
        IMapRepository<Map> mapRepository,
        IMapModelRepository<MapModel> mapModelRepository,
        ITokenRepository<Token> tokenRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        ICharacterRepository<Character> characterRepository,
        IMapNpcRepository<MapNpc> mapNpcRepository,
        INpcRepository<Npc> npcRepository,
        IUnitOfWork unitOfWork,
        IImageStorageAppService imageStorage)
    {
        _repository = repository;
        _mapRepository = mapRepository;
        _mapModelRepository = mapModelRepository;
        _tokenRepository = tokenRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _characterRepository = characterRepository;
        _mapNpcRepository = mapNpcRepository;
        _npcRepository = npcRepository;
        _unitOfWork = unitOfWork;
        _imageStorage = imageStorage;
    }

    public async Task<List<MapTokenInfo>> ListByMapAsync(long userId, long mapId)
    {
        await EnsureCanReadMapAsync(userId, mapId);
        return await MapToDtoAsync(await _repository.ListByMapAsync(mapId));
    }

    public async Task<MapTokenInfo> CreateAsync(long userId, MapTokenInsertInfo info)
    {
        var map = await EnsureMapOwnerAsync(userId, info.MapId);
        if (info.TokenType == (int)MapTokenType.Character)
            throw new DomainValidationException("tokenType", "Personagens entram no mapa pelo painel da campanha.");
        if (info.TokenType == (int)MapTokenType.Npc)
            throw new DomainValidationException("tokenType", "NPCs entram no mapa pelo painel de NPCs.");
        var token = await GetTokenAsync(info.TokenId);
        await EnsureFreeHexAsync(map, info.X, info.Y, null);

        var mapToken = new MapToken { MapId = info.MapId, TokenId = info.TokenId };
        var name = string.IsNullOrWhiteSpace(info.Name) ? token.Name : info.Name;
        mapToken.Update(name, info.TokenType, info.Sheet, info.Life, info.Energy, info.Status, info.Move, info.X, info.Y, info.Look);
        mapToken.CreatedAt = mapToken.UpdatedAt;

        return await MapToDtoAsync(await _repository.InsertAsync(mapToken));
    }

    /// <summary>
    /// Places a campaign character: its own token, or — when it has none — the informed one, which is then
    /// saved on the character too (011 FR-015), in the same transaction.
    /// </summary>
    public async Task<MapTokenInfo> PlaceCharacterAsync(long userId, MapTokenCharacterInsertInfo info)
    {
        var map = await EnsureMapOwnerAsync(userId, info.MapId);
        var participation = await _campaignCharacterRepository.GetByIdAsync(info.CampaignCharacterId)
            ?? throw new KeyNotFoundException("Participação não encontrada.");
        if (participation.CampaignId != map.CampaignId || participation.Status != CampaignCharacterStatus.Approved)
            throw new ConflictException("Só personagens aprovados nesta campanha podem ser colocados no mapa.");
        if (await _repository.GetByMapAndCampaignCharacterAsync(map.MapId, participation.CampaignCharacterId) != null)
            throw new ConflictException("O personagem já está neste mapa.");
        await EnsureFreeHexAsync(map, info.X, info.Y, null);

        var character = await _characterRepository.GetByIdAsync(participation.CharacterId)
            ?? throw new KeyNotFoundException("Personagem não encontrado.");
        var tokenId = character.TokenId ?? info.TokenId
            ?? throw new DomainValidationException("tokenId", "Escolha um token para o personagem.");
        await GetTokenAsync(tokenId);

        MapToken saved = null!;
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (character.AssignTokenIfMissing(tokenId))
                await _characterRepository.UpdateAsync(character);
            saved = await _repository.InsertAsync(MapToken.PlaceCharacter(
                map.MapId, tokenId, participation.CampaignCharacterId, character.Name, info.X, info.Y));
        });
        return await MapToDtoAsync(saved);
    }

    public async Task<MapTokenInfo> UpdateAsync(long userId, long mapTokenId, MapTokenUpdateInfo info)
    {
        var (mapToken, map) = await GetOwnedAsync(userId, mapTokenId);
        await EnsureFreeHexAsync(map, info.X, info.Y, mapToken.MapTokenId);
        mapToken.Update(info.Name, info.TokenType, info.Sheet, info.Life, info.Energy, info.Status, info.Move, info.X, info.Y, info.Look);
        return await MapToDtoAsync(await _repository.UpdateAsync(mapToken));
    }

    /// <summary>
    /// Moves and turns a piece (015). The master moves any piece without limit; a player moves only the piece of
    /// his own approved character, and the cheapest cost (1 per step into the hex ahead + 1 per 60° turn,
    /// around the other pieces) must fit the character's move.
    /// </summary>
    public async Task<MapTokenInfo> MoveAsync(long userId, long mapTokenId, MapTokenPositionInfo info)
    {
        var mapToken = await _repository.GetByIdAsync(mapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        var map = await _mapRepository.GetByIdAsync(mapToken.MapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        var look = info.Look ?? mapToken.Look;
        if (map.UserId != userId)
            await EnsurePlayerMoveAsync(userId, map, mapToken, info.X, info.Y, look);
        await EnsureFreeHexAsync(map, info.X, info.Y, mapToken.MapTokenId);

        mapToken.MoveTo(info.X, info.Y);
        mapToken.Face(look);
        return await MapToDtoAsync(await _repository.UpdateAsync(mapToken));
    }

    /// <summary>A player moves only his own approved character, within its move.</summary>
    private async Task EnsurePlayerMoveAsync(long userId, Map map, MapToken mapToken, int x, int y, int look)
    {
        var participation = mapToken.CampaignCharacterId is long participationId
            ? await _campaignCharacterRepository.GetByIdAsync(participationId)
            : null;
        var character = participation != null ? await _characterRepository.GetByIdAsync(participation.CharacterId) : null;
        if (participation == null || participation.Status != CampaignCharacterStatus.Approved || character?.UserId != userId)
            throw new UnauthorizedAccessException("Você só pode mover os seus personagens.");

        var model = await _mapModelRepository.GetByIdAsync(map.MapModelId);
        var others = (await _repository.ListByMapAsync(map.MapId))
            .Where(t => t.MapTokenId != mapToken.MapTokenId)
            .Select(t => (t.X, t.Y))
            .ToHashSet();
        var cost = HexGrid.MovementCost(mapToken.X, mapToken.Y, mapToken.Look, x, y, look,
            model?.GridWidth ?? int.MaxValue, model?.GridHeight ?? int.MaxValue, (hx, hy) => others.Contains((hx, hy)));
        if (cost == null || cost > character.Move)
            throw new DomainValidationException("move", "O movimento passou do máximo.");
    }

    public async Task<MapTokenInfo> ChangeTokenAsync(long userId, long mapTokenId, MapTokenTokenInfo info)
    {
        var (mapToken, _) = await GetOwnedAsync(userId, mapTokenId);
        await GetTokenAsync(info.TokenId);
        mapToken.ChangeToken(info.TokenId);
        return await MapToDtoAsync(await _repository.UpdateAsync(mapToken));
    }

    /// <summary>Removes the piece; a piece of an NPC occurrence takes the occurrence with it.</summary>
    public async Task DeleteAsync(long userId, long mapTokenId)
    {
        var (mapToken, _) = await GetOwnedAsync(userId, mapTokenId);
        await _unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await _repository.DeleteAsync(mapToken.MapTokenId);
            if (mapToken.MapNpcId is long mapNpcId)
                await _mapNpcRepository.DeleteAsync(mapNpcId);
        });
    }

    private async Task<(MapToken MapToken, Map Map)> GetOwnedAsync(long userId, long mapTokenId)
    {
        var mapToken = await _repository.GetByIdAsync(mapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        return (mapToken, await EnsureMapOwnerAsync(userId, mapToken.MapId));
    }

    private async Task<Token> GetTokenAsync(long tokenId)
    {
        return await _tokenRepository.GetByIdAsync(tokenId)
            ?? throw new KeyNotFoundException("Token não encontrado.");
    }

    /// <summary>The cell must be inside the map model's grid and hold no other piece.</summary>
    private async Task EnsureFreeHexAsync(Map map, int x, int y, long? exceptMapTokenId)
    {
        var model = await _mapModelRepository.GetByIdAsync(map.MapModelId);
        if (model != null && !HexGrid.IsInsideGrid(x, y, model.GridWidth, model.GridHeight))
            throw new DomainValidationException("x", "A posição está fora da grid do mapa.");
        if (await _repository.ExistsAtAsync(map.MapId, x, y, exceptMapTokenId))
            throw new ConflictException("O hex já está ocupado.");
    }

    /// <summary>Reading is allowed to the map owner (master) and to owners of approved characters.</summary>
    private async Task EnsureCanReadMapAsync(long userId, long mapId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        if (map.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(map.CampaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os tokens do mapa.");
    }

    /// <summary>Only the owner of a map that is not deleted can change its tokens.</summary>
    private async Task<Map> EnsureMapOwnerAsync(long userId, long mapId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        if (map.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono do mapa pode gerenciar seus tokens.");
        return map;
    }

    private async Task<MapTokenInfo> MapToDtoAsync(MapToken mapToken) => (await MapToDtoAsync(new List<MapToken> { mapToken })).Single();

    /// <summary>Loads tokens, participations and characters in batch; Character pieces show the participation.</summary>
    private async Task<List<MapTokenInfo>> MapToDtoAsync(List<MapToken> mapTokens)
    {
        if (mapTokens.Count == 0)
            return new List<MapTokenInfo>();

        var tokens = (await _tokenRepository.ListByIdsAsync(mapTokens.Select(e => e.TokenId).Distinct()))
            .ToDictionary(e => e.TokenId);
        var participationIds = mapTokens.Where(e => e.CampaignCharacterId.HasValue).Select(e => e.CampaignCharacterId!.Value).Distinct().ToList();
        var participations = new Dictionary<long, CampaignCharacter>();
        var characters = new Dictionary<long, Character>();
        if (participationIds.Count > 0)
        {
            participations = (await _campaignCharacterRepository.ListByIdsAsync(participationIds)).ToDictionary(e => e.CampaignCharacterId);
            characters = (await _characterRepository.ListByIdsAsync(participations.Values.Select(e => e.CharacterId).Distinct()))
                .ToDictionary(e => e.CharacterId);
        }
        var mapNpcIds = mapTokens.Where(e => e.MapNpcId.HasValue).Select(e => e.MapNpcId!.Value).Distinct().ToList();
        var mapNpcs = new Dictionary<long, MapNpc>();
        var npcs = new Dictionary<long, Npc>();
        if (mapNpcIds.Count > 0)
        {
            mapNpcs = (await _mapNpcRepository.ListByIdsAsync(mapNpcIds)).ToDictionary(e => e.MapNpcId);
            npcs = (await _npcRepository.ListByIdsAsync(mapNpcs.Values.Select(e => e.NpcId).Distinct())).ToDictionary(e => e.NpcId);
        }

        return mapTokens.Select(mapToken =>
        {
            var token = tokens.GetValueOrDefault(mapToken.TokenId);
            var info = new MapTokenInfo
            {
                MapTokenId = mapToken.MapTokenId,
                MapId = mapToken.MapId,
                TokenId = mapToken.TokenId,
                TokenName = token?.Name ?? string.Empty,
                UpImageUrl = _imageStorage.GetUrl(token?.UpImage),
                DownImageUrl = _imageStorage.GetUrl(token?.DownImage),
                CampaignCharacterId = mapToken.CampaignCharacterId,
                Name = mapToken.Name,
                TokenType = (int)mapToken.TokenType,
                Sheet = mapToken.Sheet,
                Life = mapToken.Life,
                Energy = mapToken.Energy,
                Status = mapToken.Status,
                Move = mapToken.Move,
                X = mapToken.X,
                Y = mapToken.Y,
                Look = mapToken.Look,
                CreatedAt = mapToken.CreatedAt,
                UpdatedAt = mapToken.UpdatedAt
            };
            if (mapToken.CampaignCharacterId is long participationId && participations.TryGetValue(participationId, out var participation))
            {
                var character = characters.GetValueOrDefault(participation.CharacterId);
                info.CharacterId = participation.CharacterId;
                info.Name = character?.Name ?? mapToken.Name;
                info.Move = character?.Move ?? 0;
                info.Life = participation.CurrentLife;
                info.Energy = participation.CurrentEnergy;
                info.Status = participation.CharacterStatus;
                info.Sheet = participation.Sheet;
            }
            if (mapToken.MapNpcId is long pieceNpcId && mapNpcs.TryGetValue(pieceNpcId, out var mapNpc))
            {
                info.MapNpcId = mapNpc.MapNpcId;
                info.NpcId = mapNpc.NpcId;
                info.Name = mapNpc.Name;
                info.Life = mapNpc.Life;
                info.Energy = mapNpc.Energy;
                info.Status = mapNpc.Status;
                info.Move = npcs.GetValueOrDefault(mapNpc.NpcId)?.Move ?? 0;
            }
            return info;
        }).ToList();
    }
}
