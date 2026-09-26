using Roll6.DTO.ApiKey;

namespace Roll6.Domain.Interfaces;

/// <summary>Who an API key authenticates as.</summary>
public record ApiKeyIdentity(long UserId, long ApiKeyId, string UserName);

/// <summary>API keys (019): the owner manages them after logging in; tools authenticate with them.</summary>
public interface IApiKeyService
{
    Task<List<ApiKeyInfo>> ListAsync(long userId);
    Task<ApiKeyCreatedInfo> CreateAsync(long userId, ApiKeyInsertInfo info);
    Task<ApiKeyInfo> RevokeAsync(long userId, long apiKeyId);
    /// <summary>Only revoked or expired keys can be deleted.</summary>
    Task DeleteAsync(long userId, long apiKeyId);

    /// <summary>The owner of a valid key, or null (unknown, malformed, expired or revoked — never says which).</summary>
    Task<ApiKeyIdentity?> AuthenticateAsync(string? plainKey);
}
