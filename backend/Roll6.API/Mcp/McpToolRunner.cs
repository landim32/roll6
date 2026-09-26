using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using ModelContextProtocol.Protocol;
using Roll6.Domain.Exceptions;

namespace Roll6.API.Mcp;

/// <summary>
/// Runs a tool body the way a controller action runs (020): the result is the same JSON the API returns, and
/// domain exceptions become the same problem details as <c>ApiControllerBase.HandleException</c> — marked as a
/// tool error so the assistant can read the reason and correct itself.
/// </summary>
public static class McpToolRunner
{
    /// <summary>Same shape as the API's JSON (camelCase, DTO property names from [JsonPropertyName]).</summary>
    public static readonly JsonSerializerOptions JSON = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        // Accents stay readable in the text the assistant reads (same data as the API, no escape sequences).
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        // The SDK marks the options read-only and requires an explicit resolver (reflection, like the API).
        TypeInfoResolver = new DefaultJsonTypeInfoResolver()
    };

    /// <summary>Operation with a response body.</summary>
    public static async Task<CallToolResult> RunAsync<T>(Func<Task<T>> action)
    {
        try
        {
            return Success(await action());
        }
        catch (Exception ex)
        {
            return Failure(ex);
        }
    }

    /// <summary>Operation without a response body (HTTP 204 in the API).</summary>
    public static async Task<CallToolResult> RunAsync(Func<Task> action)
    {
        try
        {
            await action();
            return Success(new { ok = true });
        }
        catch (Exception ex)
        {
            return Failure(ex);
        }
    }

    private static CallToolResult Success(object? value)
    {
        var element = JsonSerializer.SerializeToElement(value, JSON);
        // Structured content must be an object: lists go inside { "items": [...] }.
        var structured = element.ValueKind == JsonValueKind.Object
            ? element
            : JsonSerializer.SerializeToElement(new { items = element }, JSON);
        return new CallToolResult
        {
            Content = new List<ContentBlock> { new TextContentBlock { Text = element.GetRawText() } },
            StructuredContent = structured
        };
    }

    /// <summary>Problem details with the status the API would answer (the messages are the API's, in Portuguese).</summary>
    public static CallToolResult Failure(Exception ex)
    {
        object problem = ex switch
        {
            DomainValidationException validation => new
            {
                status = 400,
                title = "One or more validation errors occurred.",
                errors = validation.Errors
            },
            UnauthorizedAccessException => new { status = 403, title = "Forbidden", detail = ex.Message },
            KeyNotFoundException => new { status = 404, title = "Not Found", detail = ex.Message },
            ConflictException => new { status = 409, title = "Conflict", detail = ex.Message },
            _ => new { status = 500, title = "Internal Server Error", detail = ex.Message }
        };
        var element = JsonSerializer.SerializeToElement(problem, JSON);
        return new CallToolResult
        {
            IsError = true,
            Content = new List<ContentBlock> { new TextContentBlock { Text = element.GetRawText() } },
            StructuredContent = element
        };
    }
}
