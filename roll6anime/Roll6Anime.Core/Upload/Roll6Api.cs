using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Roll6Anime.Core.Upload;

/// <summary>An animation of the Roll6's library, as the API returns it.</summary>
public sealed record RemoteAnimation(
    [property: JsonPropertyName("animationId")] long AnimationId,
    [property: JsonPropertyName("userId")] long UserId,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("type")] int Type);

/// <summary>A refusal of the Roll6, with the message of its problem details ("name: …", "Apenas o dono…").</summary>
public sealed class Roll6Exception(string message, HttpStatusCode? status = null) : Exception(message)
{
    public HttpStatusCode? Status { get; } = status;
}

/// <summary>The calls the upload needs (067); the tests replace it.</summary>
public interface IRoll6Api
{
    Task<long> GetMyUserIdAsync(CancellationToken cancel = default);
    /// <summary>The animation, or null when it no longer exists.</summary>
    Task<RemoteAnimation?> GetAnimationAsync(long animationId, CancellationToken cancel = default);
    /// <summary>The user's own animations whose name contains the text (the API's search).</summary>
    Task<IReadOnlyList<RemoteAnimation>> SearchMineAsync(string name, CancellationToken cancel = default);
    Task<RemoteAnimation> CreateAsync(string name, int type, JsonElement content, CancellationToken cancel = default);
    Task<RemoteAnimation> UpdateAsync(long animationId, string name, int type, JsonElement content, CancellationToken cancel = default);
}

/// <summary>The Roll6's REST API with the user's API key (<c>/api/user/me</c>, <c>/api/animation</c>).</summary>
public sealed class Roll6Api : IRoll6Api, IDisposable
{
    private readonly HttpClient _http;

    public Roll6Api(Roll6Connection connection, HttpMessageHandler? handler = null)
    {
        _http = handler == null ? new HttpClient() : new HttpClient(handler);
        _http.BaseAddress = new Uri(connection.ApiBase.TrimEnd('/') + "/");
        _http.Timeout = TimeSpan.FromSeconds(60);
        foreach (var (name, value) in connection.Headers)
            _http.DefaultRequestHeaders.TryAddWithoutValidation(name, value);
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("roll6anime/1.0");
    }

    public async Task<long> GetMyUserIdAsync(CancellationToken cancel = default)
    {
        using var response = await _http.GetAsync("api/user/me", cancel);
        var me = await ReadAsync<JsonElement>(response, cancel);
        return me.GetProperty("userId").GetInt64();
    }

    public async Task<RemoteAnimation?> GetAnimationAsync(long animationId, CancellationToken cancel = default)
    {
        using var response = await _http.GetAsync($"api/animation/{animationId}", cancel);
        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;
        return await ReadAsync<RemoteAnimation>(response, cancel);
    }

    public async Task<IReadOnlyList<RemoteAnimation>> SearchMineAsync(string name, CancellationToken cancel = default)
    {
        using var response = await _http.GetAsync($"api/animation?mine=true&pageSize=100&search={Uri.EscapeDataString(name)}", cancel);
        var page = await ReadAsync<JsonElement>(response, cancel);
        return page.GetProperty("items").Deserialize<List<RemoteAnimation>>() ?? new List<RemoteAnimation>();
    }

    public async Task<RemoteAnimation> CreateAsync(string name, int type, JsonElement content, CancellationToken cancel = default)
    {
        using var response = await _http.PostAsJsonAsync("api/animation", new { name, type, content }, cancel);
        return await ReadAsync<RemoteAnimation>(response, cancel);
    }

    public async Task<RemoteAnimation> UpdateAsync(long animationId, string name, int type, JsonElement content, CancellationToken cancel = default)
    {
        using var response = await _http.PutAsJsonAsync($"api/animation/{animationId}", new { name, type, content }, cancel);
        return await ReadAsync<RemoteAnimation>(response, cancel);
    }

    public void Dispose() => _http.Dispose();

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response, CancellationToken cancel)
    {
        var body = await response.Content.ReadAsStringAsync(cancel);
        if (!response.IsSuccessStatusCode)
            throw new Roll6Exception(ProblemMessage(response.StatusCode, body), response.StatusCode);
        return JsonSerializer.Deserialize<T>(body)!;
    }

    /// <summary>The problem's message: the first validation error ("key: message"), else detail, else title, else the status.</summary>
    public static string ProblemMessage(HttpStatusCode status, string body)
    {
        if (status == HttpStatusCode.Unauthorized)
            return "O Roll6 recusou a chave de API (401): ela pode ter expirado ou sido revogada.";
        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;
            if (root.ValueKind == JsonValueKind.Object)
            {
                if (root.TryGetProperty("errors", out var errors) && errors.ValueKind == JsonValueKind.Object)
                    foreach (var error in errors.EnumerateObject())
                        if (error.Value.ValueKind == JsonValueKind.Array && error.Value.GetArrayLength() > 0)
                            return $"{error.Name}: {error.Value[0].GetString()}";
                foreach (var field in new[] { "detail", "title" })
                    if (root.TryGetProperty(field, out var text) && text.ValueKind == JsonValueKind.String
                        && !string.IsNullOrWhiteSpace(text.GetString()))
                        return text.GetString()!;
            }
        }
        catch (JsonException)
        {
            // Not JSON: a plain-text body.
        }
        var plain = body.Trim();
        return plain.Length > 0 && plain.Length <= 300 ? plain : $"O Roll6 respondeu {(int)status}.";
    }
}
