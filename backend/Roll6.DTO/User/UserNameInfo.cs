using System.Text.Json.Serialization;

namespace Roll6.DTO.User;

public class UserNameInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}
