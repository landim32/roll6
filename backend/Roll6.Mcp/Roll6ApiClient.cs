using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ModelContextProtocol.Protocol;

namespace Roll6.Mcp;

/// <summary>
/// Calls the Roll6 REST API on behalf of the assistant's user (020): every tool is one API request, carrying the
/// caller's own credential (X-Api-Key or Authorization) — so permissions, validation, results and the real-time events
/// are exactly the API's.
/// </summary>
public class Roll6ApiClient
{
    public const string API_KEY_HEADER = "X-Api-Key";

    private readonly HttpClient _http;
    private readonly IHttpContextAccessor _accessor;

    public Roll6ApiClient(HttpClient http, IHttpContextAccessor accessor)
    {
        _http = http;
        _accessor = accessor;
    }

    /// <summary>Sends a request; <paramref name="body"/> goes as JSON, <paramref name="query"/> skips null values.</summary>
    public async Task<CallToolResult> SendAsync(HttpMethod method, string path, object? body = null, params (string Name, object? Value)[] query)
    {
        using var request = new HttpRequestMessage(method, path + QueryString(query));
        if (body != null)
            request.Content = JsonContent.Create(body, body.GetType(), options: McpToolRunner.JSON);
        return await SendAsync(request);
    }

    /// <summary>Uploads a file as multipart/form-data field "file" (POST /api/image).</summary>
    public async Task<CallToolResult> PostFileAsync(string path, byte[] content, string fileName, string? contentType)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, path);
        var file = new ByteArrayContent(content);
        if (!string.IsNullOrWhiteSpace(contentType))
            file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        request.Content = new MultipartFormDataContent { { file, "file", string.IsNullOrWhiteSpace(fileName) ? "image" : fileName } };
        return await SendAsync(request);
    }

    private async Task<CallToolResult> SendAsync(HttpRequestMessage request)
    {
        CopyCredential(request);
        try
        {
            using var response = await _http.SendAsync(request);
            return await McpToolRunner.FromResponseAsync(response);
        }
        catch (HttpRequestException ex)
        {
            return McpToolRunner.Failure(502, "Bad Gateway", $"The Roll6 API is unavailable: {ex.Message}");
        }
        catch (TaskCanceledException)
        {
            return McpToolRunner.Failure(504, "Gateway Timeout", "The Roll6 API did not answer in time.");
        }
    }

    /// <summary>The same credential the assistant used to reach the MCP server.</summary>
    private void CopyCredential(HttpRequestMessage request)
    {
        var headers = _accessor.HttpContext?.Request.Headers;
        if (headers == null)
            return;
        if (headers.TryGetValue(API_KEY_HEADER, out var key) && !string.IsNullOrWhiteSpace(key))
            request.Headers.TryAddWithoutValidation(API_KEY_HEADER, key.ToString());
        else if (headers.TryGetValue("Authorization", out var authorization) && !string.IsNullOrWhiteSpace(authorization))
            request.Headers.TryAddWithoutValidation("Authorization", authorization.ToString());
    }

    private static string QueryString((string Name, object? Value)[] query)
    {
        var parts = query
            .Where(q => q.Value != null && !(q.Value is string s && string.IsNullOrWhiteSpace(s)))
            .Select(q => $"{Uri.EscapeDataString(q.Name)}={Uri.EscapeDataString(Format(q.Value!))}")
            .ToList();
        return parts.Count == 0 ? string.Empty : "?" + string.Join('&', parts);
    }

    private static string Format(object value) => value switch
    {
        bool b => b ? "true" : "false",
        IFormattable f => f.ToString(null, CultureInfo.InvariantCulture),
        _ => value.ToString() ?? string.Empty
    };
}
