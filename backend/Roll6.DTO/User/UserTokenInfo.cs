using System.Text.Json.Serialization;

namespace Roll6.DTO.User;

public class UserTokenInfo
{
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [JsonPropertyName("user")]
    public UserInfo User { get; set; } = new();
}
