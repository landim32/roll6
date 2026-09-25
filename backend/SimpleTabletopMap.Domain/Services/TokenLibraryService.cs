using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Interfaces;
using SimpleTabletopMap.Domain.Models;
using SimpleTabletopMap.DTO.Common;
using SimpleTabletopMap.DTO.Token;
using SimpleTabletopMap.Infra.Interfaces.AppServices;
using SimpleTabletopMap.Infra.Interfaces.Repository;

namespace SimpleTabletopMap.Domain.Services;

public class TokenLibraryService : ITokenLibraryService
{
    private readonly ITokenRepository<Token> _repository;
    private readonly IMapTokenRepository<MapToken> _mapTokenRepository;
    private readonly IImageStorageAppService _imageStorage;

    public TokenLibraryService(
        ITokenRepository<Token> repository,
        IMapTokenRepository<MapToken> mapTokenRepository,
        IImageStorageAppService imageStorage)
    {
        _repository = repository;
        _mapTokenRepository = mapTokenRepository;
        _imageStorage = imageStorage;
    }

    public async Task<PagedList<TokenInfo>> ListAsync(PageQuery query)
    {
        var (items, total) = await _repository.ListPagedAsync(query.Search, query.Skip, query.PageSize);
        return new PagedList<TokenInfo>
        {
            Items = items.Select(MapToDto).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            TotalCount = total
        };
    }

    public async Task<TokenInfo> GetByIdAsync(long tokenId)
    {
        return MapToDto(await GetTokenAsync(tokenId));
    }

    public async Task<TokenInfo> CreateAsync(long userId, TokenInsertInfo info)
    {
        var token = new Token { UserId = userId };
        token.Update(info.Name, info.Description, info.UpSpace, info.DownSpace, info.UpImage, info.DownImage);
        token.CreatedAt = token.UpdatedAt;
        return MapToDto(await _repository.InsertAsync(token));
    }

    public async Task<TokenInfo> UpdateAsync(long userId, long tokenId, TokenInsertInfo info)
    {
        var token = await GetOwnedAsync(userId, tokenId);
        token.Update(info.Name, info.Description, info.UpSpace, info.DownSpace, info.UpImage, info.DownImage);
        return MapToDto(await _repository.UpdateAsync(token));
    }

    public async Task DeleteAsync(long userId, long tokenId)
    {
        await GetOwnedAsync(userId, tokenId);
        if (await _mapTokenRepository.ExistsByTokenAsync(tokenId))
            throw new ConflictException("O token está em uso em mapas e não pode ser excluído.");
        await _repository.DeleteAsync(tokenId);
    }

    private async Task<Token> GetTokenAsync(long tokenId)
    {
        return await _repository.GetByIdAsync(tokenId)
            ?? throw new KeyNotFoundException("Token não encontrado.");
    }

    private async Task<Token> GetOwnedAsync(long userId, long tokenId)
    {
        var token = await GetTokenAsync(tokenId);
        if (token.UserId != userId)
            throw new UnauthorizedAccessException("Apenas o dono pode alterar ou excluir este token.");
        return token;
    }

    private TokenInfo MapToDto(Token token) => new()
    {
        TokenId = token.TokenId,
        UserId = token.UserId,
        Name = token.Name,
        Description = token.Description,
        UpSpace = token.UpSpace,
        DownSpace = token.DownSpace,
        UpImage = token.UpImage,
        UpImageUrl = _imageStorage.GetUrl(token.UpImage),
        DownImage = token.DownImage,
        DownImageUrl = _imageStorage.GetUrl(token.DownImage),
        CreatedAt = token.CreatedAt,
        UpdatedAt = token.UpdatedAt
    };
}
