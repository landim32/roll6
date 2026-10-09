namespace Roll6.DTO.Settings;

/// <summary>
/// Web Push (043): the server's VAPID key pair (base64url, generated once) and the contact sent to the push services
/// (<c>mailto:</c> or the site URL). Empty keys turn notifications off: the key endpoint answers null and nothing is sent.
/// </summary>
public class PushSettings
{
    public string PublicKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;

    public bool Enabled => !string.IsNullOrWhiteSpace(PublicKey) && !string.IsNullOrWhiteSpace(PrivateKey);
}
