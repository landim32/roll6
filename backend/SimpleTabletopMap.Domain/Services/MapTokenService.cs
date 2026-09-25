using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.DTO.MapToken;
using SimpleTabletopMap.Infra.Interfaces.AppServices;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Domain.Services;

public class MapTokenService : IMapTokenService
{
    private readonly IMapTokenRepository<MapToken> _repository;
    private readonly IMapRepository<Map> _mapRepository;
    private readonly ITokenRepository<Token> _tokenRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly IImageStorageAppService _imageStorage;

    public MapTokenService(
        IMapTokenRepository<MapToken> repository,
        IMapRepository<Map> mapRepository,
        ITokenRepository<Token> tokenRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        IImageStorageAppService imageStorage)
    {
        _repository = repository;
        _mapRepository = mapRepository;
        _tokenRepository = tokenRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _imageStorage = imageStorage;
    }

    public async Task<List<MapTokenInfo>> ListByMapAsync(long userId, long mapId)
    {
        await EnsureCanReadMapAsync(userId, mapId);
        var mapTokens = await _repository.ListByMapAsync(mapId);
        var tokens = (await _tokenRepository.ListByIdsAsync(mapTokens.Select(e => e.TokenId)))
            .ToDictionary(e => e.TokenId);
        return mapTokens.Select(e => MapToDto(e, tokens.GetValueOrDefault(e.TokenId))).ToList();
    }

    public async Task<MapTokenInfo> CreateAsync(long userId, MapTokenInsertInfo info)
    {
        await EnsureMapOwnerAsync(userId, info.MapId);
        var token = await _tokenRepository.GetByIdAsync(info.TokenId)
            ?? throw new KeyNotFoundException("Token não encontrado.");

        var mapToken = new MapToken { MapId = info.MapId, TokenId = info.TokenId };
        var name = string.IsNullOrWhiteSpace(info.Name) ? token.Name : info.Name;
        mapToken.Update(name, info.TokenType, info.Sheet, info.Life, info.Energy, info.Status, info.Move, info.X, info.Y, info.Look);
        mapToken.CreatedAt = mapToken.UpdatedAt;

        return MapToDto(await _repository.InsertAsync(mapToken), token);
    }

    public async Task<MapTokenInfo> UpdateAsync(long userId, long mapTokenId, MapTokenUpdateInfo info)
    {
        var mapToken = await GetOwnedAsync(userId, mapTokenId);
        mapToken.Update(info.Name, info.TokenType, info.Sheet, info.Life, info.Energy, info.Status, info.Move, info.X, info.Y, info.Look);
        var updated = await _repository.UpdateAsync(mapToken);
        return MapToDto(updated, await _tokenRepository.GetByIdAsync(updated.TokenId));
    }

    public async Task DeleteAsync(long userId, long mapTokenId)
    {
        await GetOwnedAsync(userId, mapTokenId);
        await _repository.DeleteAsync(mapTokenId);
    }

    private async Task<MapToken> GetOwnedAsync(long userId, long mapTokenId)
    {
        var mapToken = await _repository.GetByIdAsync(mapTokenId)
            ?? throw new KeyNotFoundException("Token do mapa não encontrado.");
        await EnsureMapOwnerAsync(userId, mapToken.MapId);
        return mapToken;
    }

    /// <summary>Only the owner of a map that is not deleted can read or change its tokens.</summary>
    /// <summary>Reading is allowed to the map owner (master) and to owners of approved characters.</summary>
    private async Task EnsureCanReadMapAsync(long userId, long mapId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        if (map.UserId != userId && !await _campaignCharacterRepository.HasApprovedCharacterAsync(map.CampaignId, userId))
            throw new UnauthorizedAccessException("Apenas o mestre ou participantes aprovados podem ver os tokens do mapa.");
    }

    private async Task EnsureMapOwnerAsync(long userId, long mapId)
    {
        var map = await _mapRepository.GetByIdAsync(mapId)
            ?? throw new KeyNotFoundException("Mapa não encontrado.");
        map.EnsureNotDeleted();
        if (map.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono do mapa pode gerenciar seus tokens.");
    }

    private MapTokenInfo MapToDto(MapToken mapToken, Token? token) => new()
    {
        MapTokenId = mapToken.MapTokenId,
        MapId = mapToken.MapId,
        TokenId = mapToken.TokenId,
        TokenName = token?.Name ?? string.Empty,
        UpImageUrl = _imageStorage.GetUrl(token?.UpImage),
        DownImageUrl = _imageStorage.GetUrl(token?.DownImage),
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
}
