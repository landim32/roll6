using System.Text.Json.Serialization;

namespace SimpleTabletopMap.DTO.User;

public class UserNameInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}
