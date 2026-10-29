using System.Net;
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

    public async Task InvokeAsync(HttpContext context, IHttpClientFactory clients, IMemoryCache cache, ILogger<ApiCredentialGate> logger)
    {
        var credential = context.Request.Headers.TryGetValue(Roll6ApiClient.API_KEY_HEADER, out var key) && !string.IsNullOrWhiteSpace(key)
            ? (Header: Roll6ApiClient.API_KEY_HEADER, Value: key.ToString())
            : context.Request.Headers.TryGetValue("Authorization", out var authorization) && !string.IsNullOrWhiteSpace(authorization)
                ? (Header: "Authorization", Value: authorization.ToString())
                : (Header: string.Empty, Value: string.Empty);

        var check = credential.Value.Length == 0 ? CredentialCheck.Refused : await CheckAsync(credential, clients, cache, logger);
        if (check == CredentialCheck.Unavailable)
        {
            // The API could not answer: not the caller's fault, so never report the key as invalid.
            context.Response.StatusCode = StatusCodes.Status502BadGateway;
            await context.Response.WriteAsJsonAsync(new
            {
                status = 502,
                title = "Bad Gateway",
                detail = "The Roll6 API could not be reached to check the API key. Try again shortly."
            }, options: (System.Text.Json.JsonSerializerOptions?)null, contentType: "application/problem+json");
            return;
        }
        if (check == CredentialCheck.Refused)
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

    private enum CredentialCheck { Valid, Refused, Unavailable }

    /// <summary>Only a 401/403 from the API means a bad credential; anything else is the API being unavailable.</summary>
    private static async Task<CredentialCheck> CheckAsync((string Header, string Value) credential, IHttpClientFactory clients,
        IMemoryCache cache, ILogger<ApiCredentialGate> logger)
    {
        var cacheKey = "cred:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(credential.Header + "|" + credential.Value)));
        if (cache.TryGetValue(cacheKey, out _))
            return CredentialCheck.Valid;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/user/me");
            request.Headers.TryAddWithoutValidation(credential.Header, credential.Value);
            using var response = await clients.CreateClient(nameof(Roll6ApiClient)).SendAsync(request);
            if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            {
                logger.LogInformation("Credential refused by the API ({Status}).", (int)response.StatusCode);
                return CredentialCheck.Refused;
            }
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Credential check failed: the API answered {Status}.", (int)response.StatusCode);
                return CredentialCheck.Unavailable;
            }
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Credential check failed: the API could not be reached.");
            return CredentialCheck.Unavailable;
        }
        cache.Set(cacheKey, true, CACHE);
        return CredentialCheck.Valid;
    }
}
