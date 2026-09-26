namespace Roll6.Application.Auth;

/// <summary>Authentication names (019): the default scheme picks the API key or the JWT per request.</summary>
public static class AuthConstants
{
    /// <summary>Default scheme: forwards to <see cref="API_KEY_SCHEME"/> when the request has the key header, else to JwtBearer.</summary>
    public const string POLICY_SCHEME = "Roll6";
    public const string API_KEY_SCHEME = "ApiKey";
    public const string API_KEY_HEADER = "X-Api-Key";

    /// <summary>Logged-in users only (not API keys): key management, name/password and the real-time hub.</summary>
    public const string SESSION_POLICY = "Session";

    public const string AUTH_METHOD_CLAIM = "auth_method";
    public const string API_KEY_METHOD = "api_key";
    public const string API_KEY_ID_CLAIM = "api_key_id";
}
