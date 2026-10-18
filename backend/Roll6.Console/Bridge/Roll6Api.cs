using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Roll6.Console.Settings;

namespace Roll6.Console.Bridge;

/// <summary>The one REST call of the console (086): <c>GET /api/user/me</c>, to check the key before connecting.</summary>
public sealed class Roll6Api : IDisposable
{
    private readonly HttpClient _http;

    public Roll6Api(ConsoleSettings settings)
    {
        _http = new HttpClient { BaseAddress = new Uri(settings.BaseUrl + "/"), Timeout = TimeSpan.FromSeconds(20) };
        _http.DefaultRequestHeaders.Add("X-Api-Key", settings.ApiKey ?? string.Empty);
        _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    /// <summary>The name of the key's owner; null when the key is refused (401/403). Network errors throw.</summary>
    public async Task<string?> MeAsync(CancellationToken cancellation)
    {
        using var response = await _http.GetAsync("api/user/me", cancellation);
        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            return null;
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellation));
        return document.RootElement.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String
            ? name.GetString()
            : "usuário";
    }

    public void Dispose() => _http.Dispose();
}
