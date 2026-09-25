namespace SimpleTabletopMap.DTO.Settings;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "SimpleTabletopMap";
    public int ExpirationHours { get; set; } = 24;
}
