using System.Text.Json.Serialization;

namespace Roll6.DTO.ApiKey;

public class ApiKeyInsertInfo
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>UTC expiration; null = never expires.</summary>
    [JsonPropertyName("expiresAt")]
    public DateTime? ExpiresAt { get; set; }
}
