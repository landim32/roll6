namespace Roll6.DTO.Settings;

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "Roll6";
    public int ExpirationHours { get; set; } = 24;
}
