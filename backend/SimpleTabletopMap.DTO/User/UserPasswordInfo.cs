using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.User;

public class UserPasswordInfo
{
    [JsonPropertyName("currentPassword")]
    public string CurrentPassword { get; set; } = string.Empty;

    [JsonPropertyName("newPassword")]
    public string NewPassword { get; set; } = string.Empty;
}
