using System.Net;
using System.Text;
using Microsoft.AspNetCore.Http;
using Roll6.Mcp;

namespace Roll6.Tests.Mcp;

/// <summary>
/// A fake Roll6 API for the MCP tests: records the request each tool sends and answers with a canned response.
/// </summary>
public sealed class FakeApi : HttpMessageHandler
{
    public const string API_KEY = "r6_test-key-0123456789";

    public HttpMethod? Method { get; private set; }
    public string? PathAndQuery { get; private set; }
    public string? Body { get; private set; }
    public string? ContentType { get; private set; }
    public string? ApiKeyHeader { get; private set; }
    public string? AuthorizationHeader { get; private set; }

    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
    public string ResponseBody { get; set; } = "{}";
    public string ResponseContentType { get; set; } = "application/json";

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Method = request.Method;
        PathAndQuery = request.RequestUri!.PathAndQuery;
        Body = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
        ContentType = request.Content?.Headers.ContentType?.MediaType;
        ApiKeyHeader = request.Headers.TryGetValues(Roll6ApiClient.API_KEY_HEADER, out var key) ? key.Single() : null;
        AuthorizationHeader = request.Headers.Authorization?.ToString();
        return new HttpResponseMessage(Status)
        {
            Content = Status == HttpStatusCode.NoContent ? null : new StringContent(ResponseBody, Encoding.UTF8, ResponseContentType)
        };
    }

    /// <summary>A client for the fake API, acting for a caller that sent the given credential to the MCP server.</summary>
    public Roll6ApiClient Client(string? apiKey = API_KEY, string? authorization = null)
    {
        var context = new DefaultHttpContext();
        if (apiKey != null)
            context.Request.Headers[Roll6ApiClient.API_KEY_HEADER] = apiKey;
        if (authorization != null)
            context.Request.Headers.Authorization = authorization;
        return new Roll6ApiClient(new HttpClient(this) { BaseAddress = new Uri("http://api:8080") },
            new HttpContextAccessor { HttpContext = context });
    }
}
