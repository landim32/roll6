using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.User;

public class UserLoginInfo
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("password")]
    public string Password { get; set; } = string.Empty;
}
