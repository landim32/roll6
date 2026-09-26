using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.ApiKey;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>
/// API keys (019). Each user manages only his own keys; a valid key authenticates as its owner with his full
/// access. Nothing is cached, so a revoked key stops working on the next request.
/// </summary>
public class ApiKeyService : IApiKeyService
{
    /// <summary>"Last used" is written at most this often per key (not on every request).</summary>
    private static readonly TimeSpan LAST_USED_RESOLUTION = TimeSpan.FromMinutes(1);

    private readonly IApiKeyRepository<ApiKey> _repository;
    private readonly IUserRepository<User> _userRepository;
    private readonly TimeProvider _clock;

    public ApiKeyService(IApiKeyRepository<ApiKey> repository, IUserRepository<User> userRepository, TimeProvider clock)
    {
        _repository = repository;
        _userRepository = userRepository;
        _clock = clock;
    }

    private DateTime Now => _clock.GetUtcNow().UtcDateTime;

    public async Task<List<ApiKeyInfo>> ListAsync(long userId)
    {
        var now = Now;
        return (await _repository.ListByUserAsync(userId)).Select(k => MapToDto(k, now)).ToList();
    }

    public async Task<ApiKeyCreatedInfo> CreateAsync(long userId, ApiKeyInsertInfo info)
    {
        var now = Now;
        var expiresAt = info.ExpiresAt.HasValue ? DateTime.SpecifyKind(info.ExpiresAt.Value.ToUniversalTime(), DateTimeKind.Unspecified) : (DateTime?)null;
        var (apiKey, plainKey) = ApiKey.Generate(userId, info.Name, expiresAt, now);
        if (await _repository.CountActiveByUserAsync(userId, now) >= ApiKey.MAX_ACTIVE_PER_USER)
            throw new ConflictException($"Limite de {ApiKey.MAX_ACTIVE_PER_USER} chaves ativas atingido. Revogue uma para criar outra.");

        var saved = await _repository.InsertAsync(apiKey);
        var dto = MapToDto(saved, now);
        return new ApiKeyCreatedInfo
        {
            ApiKeyId = dto.ApiKeyId,
            Name = dto.Name,
            KeyPrefix = dto.KeyPrefix,
            CreatedAt = dto.CreatedAt,
            ExpiresAt = dto.ExpiresAt,
            LastUsedAt = dto.LastUsedAt,
            RevokedAt = dto.RevokedAt,
            Status = dto.Status,
            Key = plainKey
        };
    }

    public async Task<ApiKeyInfo> RevokeAsync(long userId, long apiKeyId)
    {
        var apiKey = await GetOwnedAsync(userId, apiKeyId);
        var now = Now;
        apiKey.Revoke(now);
        return MapToDto(await _repository.UpdateAsync(apiKey), now);
    }

    public async Task DeleteAsync(long userId, long apiKeyId)
    {
        var apiKey = await GetOwnedAsync(userId, apiKeyId);
        if (apiKey.IsActive(Now))
            throw new ConflictException("Revogue a chave antes de excluí-la.");
        await _repository.DeleteAsync(apiKey.ApiKeyId);
    }

    public async Task<ApiKeyIdentity?> AuthenticateAsync(string? plainKey)
    {
        if (!ApiKey.LooksLikeKey(plainKey))
            return null;
        var apiKey = await _repository.GetByHashAsync(ApiKey.Hash(plainKey!));
        var now = Now;
        if (apiKey == null || !apiKey.IsActive(now))
            return null;
        var user = await _userRepository.GetByIdAsync(apiKey.UserId);
        if (user == null)
            return null;

        if (apiKey.LastUsedAt == null || now - apiKey.LastUsedAt.Value >= LAST_USED_RESOLUTION)
            await _repository.TouchLastUsedAsync(apiKey.ApiKeyId, now);
        return new ApiKeyIdentity(user.UserId, apiKey.ApiKeyId, user.Name);
    }

    /// <summary>Someone else's key answers "not found": its existence is not revealed.</summary>
    private async Task<ApiKey> GetOwnedAsync(long userId, long apiKeyId)
    {
        var apiKey = await _repository.GetByIdAsync(apiKeyId);
        if (apiKey == null || apiKey.UserId != userId)
            throw new KeyNotFoundException("Chave de API não encontrada.");
        return apiKey;
    }

    private static ApiKeyInfo MapToDto(ApiKey apiKey, DateTime now) => new()
    {
        ApiKeyId = apiKey.ApiKeyId,
        Name = apiKey.Name,
        KeyPrefix = apiKey.KeyPrefix,
        CreatedAt = apiKey.CreatedAt,
        ExpiresAt = apiKey.ExpiresAt,
        LastUsedAt = apiKey.LastUsedAt,
        RevokedAt = apiKey.RevokedAt,
        Status = apiKey.Status(now)
    };
}
