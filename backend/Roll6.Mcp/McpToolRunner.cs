using System.Net;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using ModelContextProtocol.Protocol;

namespace Roll6.Mcp;

/// <summary>
/// Turns the REST API's answer into a tool result (020): success = the API's JSON (as text and structured content),
/// failure = the API's problem details (status, detail, per-field errors) marked as a tool error so the assistant can
/// read the reason and correct itself.
/// </summary>
public static class McpToolRunner
{
    /// <summary>Same shape as the API's JSON (camelCase); accents stay readable in the text the assistant reads.</summary>
    public static readonly JsonSerializerOptions JSON = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        // The SDK marks the options read-only and requires an explicit resolver.
        TypeInfoResolver = new DefaultJsonTypeInfoResolver()
    };

    /// <summary>Result of an API call (the response is disposed by the caller).</summary>
    public static async Task<CallToolResult> FromResponseAsync(HttpResponseMessage response)
    {
        var text = response.Content == null ? string.Empty : await response.Content.ReadAsStringAsync();
        if (response.IsSuccessStatusCode)
            return string.IsNullOrWhiteSpace(text) ? Success(JsonSerializer.SerializeToElement(new { ok = true }, JSON)) : Success(Parse(text));

        var status = (int)response.StatusCode;
        var parsed = TryParse(text);
        if (parsed is { ValueKind: JsonValueKind.Object } problem)
        {
            // ProblemDetails from the API; make sure the status is there.
            if (!problem.TryGetProperty("status", out _))
                return Failure(status, Reason(response.StatusCode), problem.GetRawText());
            return Error(problem);
        }
        // Plain-text body (e.g. unexpected 500 with the exception message) or none (e.g. 401).
        return Failure(status, Reason(response.StatusCode), string.IsNullOrWhiteSpace(text) ? null : text.Trim('"'));
    }

    /// <summary>Error raised before calling the API (e.g. invalid base64), in the API's problem-details shape.</summary>
    public static CallToolResult Failure(int status, string title, string? detail = null, IDictionary<string, string[]>? errors = null)
    {
        object problem = errors != null
            ? new { status, title, errors }
            : new { status, title, detail };
        return Error(JsonSerializer.SerializeToElement(problem, JSON));
    }

    private static CallToolResult Success(JsonElement element)
    {
        // Structured content must be an object: lists go inside { "items": [...] }.
        var structured = element.ValueKind == JsonValueKind.Object
            ? element
            : JsonSerializer.SerializeToElement(new { items = element }, JSON);
        return new CallToolResult
        {
            Content = new List<ContentBlock> { new TextContentBlock { Text = JsonSerializer.Serialize(element, JSON) } },
            StructuredContent = structured
        };
    }

    private static CallToolResult Error(JsonElement problem) => new()
    {
        IsError = true,
        Content = new List<ContentBlock> { new TextContentBlock { Text = JsonSerializer.Serialize(problem, JSON) } },
        StructuredContent = problem
    };

    private static JsonElement Parse(string text) =>
        TryParse(text) ?? JsonSerializer.SerializeToElement(new { value = text }, JSON);

    private static JsonElement? TryParse(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return null;
        try
        {
            using var document = JsonDocument.Parse(text);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string Reason(HttpStatusCode status) => status switch
    {
        HttpStatusCode.BadRequest => "Bad Request",
        HttpStatusCode.Unauthorized => "Unauthorized",
        HttpStatusCode.Forbidden => "Forbidden",
        HttpStatusCode.NotFound => "Not Found",
        HttpStatusCode.Conflict => "Conflict",
        _ => status.ToString()
    };
}
