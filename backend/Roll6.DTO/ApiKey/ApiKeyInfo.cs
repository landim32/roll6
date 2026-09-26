using System.Text.Json.Serialization;

namespace Roll6.DTO.ApiKey;

/// <summary>An API key as listed to its owner (never the key itself).</summary>
public class ApiKeyInfo
{
    [JsonPropertyName("apiKeyId")]
    public long ApiKeyId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>First characters of the key, to tell keys apart ("r6_ab12cd34").</summary>
    [JsonPropertyName("keyPrefix")]
    public string KeyPrefix { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    /// <summary>Null = never expires.</summary>
    [JsonPropertyName("expiresAt")]
    public DateTime? ExpiresAt { get; set; }

    [JsonPropertyName("lastUsedAt")]
    public DateTime? LastUsedAt { get; set; }

    [JsonPropertyName("revokedAt")]
    public DateTime? RevokedAt { get; set; }

    /// <summary>"active", "expired" or "revoked".</summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}
