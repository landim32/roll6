using SimpleTabletopMap.DTO.Common;
using SimpleTabletopMap.DTO.Token;

namespace SimpleTabletopMap.Domain.Interfaces;

/// <summary>Library of reusable tokens (named to avoid confusion with the JWT <see cref="ITokenService"/>).</summary>
public interface ITokenLibraryService
{
    Task<PagedList<TokenInfo>> ListAsync(PageQuery query);
    Task<TokenInfo> GetByIdAsync(long tokenId);
    Task<TokenInfo> CreateAsync(long userId, TokenInsertInfo info);
    Task<TokenInfo> UpdateAsync(long userId, long tokenId, TokenInsertInfo info);
    Task DeleteAsync(long userId, long tokenId);
}
