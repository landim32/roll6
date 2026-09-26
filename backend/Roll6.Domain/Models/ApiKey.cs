using System.Security.Cryptography;
using System.Text;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// A key that lets tools call the API as its owner without logging in (019). Only its SHA-256 hash and a short
/// prefix are stored: the full key exists once, in the creation response.
/// </summary>
public class ApiKey
{
    public const string PREFIX = "r6_";
    public const int MAX_NAME = 100;
    public const int MAX_ACTIVE_PER_USER = 10;
    public const string STATUS_ACTIVE = "active";
    public const string STATUS_EXPIRED = "expired";
    public const string STATUS_REVOKED = "revoked";

    /// <summary>Random bytes of a key (256 bits: a plain hash is enough, it's not a human password).</summary>
    private const int RANDOM_BYTES = 32;
    /// <summary>Characters shown after the prefix to tell keys apart.</summary>
    private const int VISIBLE_CHARS = 8;

    public long ApiKeyId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string KeyPrefix { get; set; } = string.Empty;
    public string KeyHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    /// <summary>New key for the user; returns the entity to store and the full key to show once.</summary>
    public static (ApiKey ApiKey, string PlainKey) Generate(long userId, string? name, DateTime? expiresAt, DateTime now)
    {
        var validName = Guard.RequiredText(name, "name", MAX_NAME);
        if (expiresAt.HasValue && expiresAt.Value <= now)
            throw new DomainValidationException("expiresAt", "A data de expiração deve estar no futuro.");

        var plainKey = PREFIX + Base64Url(RandomNumberGenerator.GetBytes(RANDOM_BYTES));
        var apiKey = new ApiKey
        {
            UserId = userId,
            Name = validName,
            KeyPrefix = plainKey[..(PREFIX.Length + VISIBLE_CHARS)],
            KeyHash = Hash(plainKey),
            CreatedAt = now,
            ExpiresAt = expiresAt
        };
        return (apiKey, plainKey);
    }

    /// <summary>Lower-case hex SHA-256 of the full key (what is stored and looked up).</summary>
    public static string Hash(string plainKey) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(plainKey))).ToLowerInvariant();

    /// <summary>Only strings shaped like our keys are worth looking up.</summary>
    public static bool LooksLikeKey(string? value) =>
        !string.IsNullOrEmpty(value) && value.StartsWith(PREFIX, StringComparison.Ordinal) && value.Length > PREFIX.Length + VISIBLE_CHARS
        && value.Length <= 200;

    public bool IsActive(DateTime now) => RevokedAt == null && (ExpiresAt == null || ExpiresAt > now);

    public string Status(DateTime now) =>
        RevokedAt != null ? STATUS_REVOKED : IsActive(now) ? STATUS_ACTIVE : STATUS_EXPIRED;

    /// <summary>Stops the key for good (a second call keeps the first date).</summary>
    public void Revoke(DateTime now)
    {
        RevokedAt ??= now;
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
