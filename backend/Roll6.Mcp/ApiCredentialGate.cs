using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Caching.Memory;

namespace Roll6.Mcp;

/// <summary>
/// Refuses MCP requests without a valid Roll6 credential (020 FR-003) before any tool runs. The credential is checked
/// with the API itself (GET /api/user/me) and the positive answer is cached briefly; every tool call is still
/// authorized again by the API, so revoked keys stop working immediately for operations.
/// </summary>
public class ApiCredentialGate
{
    private static readonly TimeSpan CACHE = TimeSpan.FromSeconds(60);

    private readonly RequestDelegate _next;

    public ApiCredentialGate(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IHttpClientFactory clients, IMemoryCache cache)
    {
        var credential = context.Request.Headers.TryGetValue(Roll6ApiClient.API_KEY_HEADER, out var key) && !string.IsNullOrWhiteSpace(key)
            ? (Header: Roll6ApiClient.API_KEY_HEADER, Value: key.ToString())
            : context.Request.Headers.TryGetValue("Authorization", out var authorization) && !string.IsNullOrWhiteSpace(authorization)
                ? (Header: "Authorization", Value: authorization.ToString())
                : (Header: string.Empty, Value: string.Empty);

        if (credential.Value.Length == 0 || !await IsValidAsync(credential, clients, cache))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new
            {
                status = 401,
                title = "Unauthorized",
                detail = "Send a valid Roll6 API key in the X-Api-Key header (Roll6 > user menu > Chaves de API)."
            }, options: (System.Text.Json.JsonSerializerOptions?)null, contentType: "application/problem+json");
            return;
        }
        await _next(context);
    }

    private static async Task<bool> IsValidAsync((string Header, string Value) credential, IHttpClientFactory clients, IMemoryCache cache)
    {
        var cacheKey = "cred:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(credential.Header + "|" + credential.Value)));
        if (cache.TryGetValue(cacheKey, out _))
            return true;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/user/me");
            request.Headers.TryAddWithoutValidation(credential.Header, credential.Value);
            using var response = await clients.CreateClient(nameof(Roll6ApiClient)).SendAsync(request);
            if (!response.IsSuccessStatusCode)
                return false;
        }
        catch (HttpRequestException)
        {
            return false;
        }
        cache.Set(cacheKey, true, CACHE);
        return true;
    }
}
