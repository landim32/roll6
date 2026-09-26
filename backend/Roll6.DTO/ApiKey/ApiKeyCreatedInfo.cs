using System.Text.Json.Serialization;

namespace Roll6.DTO.ApiKey;

/// <summary>A new API key: the only response that carries the full key.</summary>
public class ApiKeyCreatedInfo : ApiKeyInfo
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;
}
