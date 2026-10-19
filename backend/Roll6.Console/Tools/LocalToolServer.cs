using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Protocol;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Console.Tools;

/// <summary>What answers a tool call (the bridge, or a fake in tests).</summary>
public delegate Task<ToolResultInfo> ToolInvoker(ToolCallInfo call, CancellationToken cancellation);

/// <summary>A running tool server of one run: where the Claude reaches it and the tools it offers.</summary>
public interface IToolHost : IAsyncDisposable
{
    /// <summary>"http://127.0.0.1:{port}/mcp".</summary>
    string Url { get; }

    /// <summary>The bearer token every request must carry.</summary>
    string Token { get; }

    IReadOnlyList<string> ToolNames { get; }
}

/// <summary>Starts a tool server for a run (the real one, or a fake in tests).</summary>
public interface IToolHostFactory
{
    Task<IToolHost> StartAsync(IReadOnlyList<ToolInfo> tools, ToolInvoker invoke, CancellationToken cancellation);
}

/// <summary>
/// The local MCP server of one run (094, contracts/console-tools.md): Streamable HTTP on <c>127.0.0.1</c> with a port
/// the OS picks and a random token per run, offering exactly the tools the server put in <c>run.tools</c> and forwarding
/// every call to <see cref="ToolInvoker"/>. It knows nothing of what the tools do and lives only while the run lasts.
/// </summary>
public sealed class LocalToolServer : IToolHost
{
    /// <summary>The MCP server name the Claude sees: its tools are "mcp__roll6-editor__{name}".</summary>
    public const string SERVER_NAME = "roll6-editor";

    private readonly WebApplication _app;

    private LocalToolServer(WebApplication app, string url, string token, IReadOnlyList<string> names)
    {
        _app = app;
        Url = url;
        Token = token;
        ToolNames = names;
    }

    public string Url { get; }
    public string Token { get; }
    public IReadOnlyList<string> ToolNames { get; }

    /// <summary>The factory the console uses.</summary>
    public static IToolHostFactory Factory { get; } = new LocalFactory();

    /// <summary>A random 32-byte token, base64url.</summary>
    public static string NewToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    /// <summary>True when the request carries the run's token (header, or the "token" query as a fallback).</summary>
    public static bool IsAuthorized(HttpRequest request, string token)
    {
        var header = request.Headers.Authorization.ToString();
        if (header.StartsWith("Bearer ", StringComparison.Ordinal) && FixedEquals(header["Bearer ".Length..], token))
            return true;
        return request.Query.TryGetValue("token", out var query) && FixedEquals(query.ToString(), token);
    }

    private static bool FixedEquals(string given, string expected) =>
        CryptographicOperations.FixedTimeEquals(System.Text.Encoding.UTF8.GetBytes(given), System.Text.Encoding.UTF8.GetBytes(expected));

    /// <summary>The MCP result of a tool answer: its text, then each image.</summary>
    public static CallToolResult ToResult(ToolResultInfo result)
    {
        var content = new List<ContentBlock>();
        if (!string.IsNullOrEmpty(result.Text) || result.Images.Count == 0)
            content.Add(new TextContentBlock { Text = result.Text ?? string.Empty });
        foreach (var image in result.Images)
        {
            byte[] bytes;
            try
            {
                bytes = Convert.FromBase64String(image.Data);
            }
            catch (FormatException)
            {
                continue;
            }
            content.Add(ImageContentBlock.FromBytes(bytes, string.IsNullOrWhiteSpace(image.MediaType) ? "image/png" : image.MediaType));
        }
        return new CallToolResult { Content = content, IsError = result.IsError };
    }

    public static async Task<LocalToolServer> StartAsync(IReadOnlyList<ToolInfo> tools, ToolInvoker invoke, CancellationToken cancellation)
    {
        var token = NewToken();
        var protocolTools = tools.Select(t => new Tool { Name = t.Name, Description = t.Description, InputSchema = t.InputSchema }).ToList();
        var names = tools.Select(t => t.Name).ToHashSet(StringComparer.Ordinal);
        var callNumber = 0;

        var builder = WebApplication.CreateSlimBuilder(new WebApplicationOptions { ContentRootPath = AppContext.BaseDirectory });
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddMcpServer(options =>
            {
                options.ServerInfo = new Implementation { Name = SERVER_NAME, Version = "1.0.0" };
            })
            .WithHttpTransport(options => options.Stateless = true)
            .WithListToolsHandler((_, _) => ValueTask.FromResult(new ListToolsResult { Tools = protocolTools }))
            .WithCallToolHandler(async (request, ct) =>
            {
                var name = request.Params?.Name ?? string.Empty;
                var callId = $"c{Interlocked.Increment(ref callNumber)}";
                if (!names.Contains(name))
                    return ToResult(ToolResultInfo.Error(callId, $"Ferramenta desconhecida: {name}."));
                var arguments = request.Params?.Arguments is { } given ? JsonSerializer.SerializeToElement(given) : default;
                var result = await invoke(new ToolCallInfo { CallId = callId, Name = name, Arguments = arguments }, ct);
                return ToResult(result);
            });

        var app = builder.Build();
        app.Use(async (context, next) =>
        {
            if (!IsAuthorized(context.Request, token))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
            await next(context);
        });
        app.MapMcp("/mcp");
        await app.StartAsync(cancellation);
        var address = app.Urls.First();
        return new LocalToolServer(app, $"{address.TrimEnd('/')}/mcp", token, names.ToList());
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            using var stop = new CancellationTokenSource(TimeSpan.FromSeconds(2));
            await _app.StopAsync(stop.Token);
        }
        catch (Exception)
        {
            // Leaving anyway.
        }
        await _app.DisposeAsync();
    }

    private sealed class LocalFactory : IToolHostFactory
    {
        public async Task<IToolHost> StartAsync(IReadOnlyList<ToolInfo> tools, ToolInvoker invoke, CancellationToken cancellation) =>
            await LocalToolServer.StartAsync(tools, invoke, cancellation);
    }
}
