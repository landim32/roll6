using Roll6.DTO.Common;
using Roll6.DTO.Token;

namespace Roll6.Domain.Interfaces;

/// <summary>Library of reusable tokens (named to avoid confusion with the JWT <see cref="ITokenService"/>).</summary>
public interface ITokenLibraryService
{
    /// <summary>The token library, or only the tokens of <paramref name="ownerUserId"/> ("Meus Tokens").</summary>
    Task<PagedList<TokenInfo>> ListAsync(PageQuery query, long? ownerUserId = null);
    Task<TokenInfo> GetByIdAsync(long tokenId);
    Task<TokenInfo> CreateAsync(long userId, TokenInsertInfo info);
    Task<TokenInfo> UpdateAsync(long userId, long tokenId, TokenInsertInfo info);
    Task DeleteAsync(long userId, long tokenId);
}
