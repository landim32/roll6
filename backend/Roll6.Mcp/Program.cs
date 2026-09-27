using Microsoft.AspNetCore.HttpOverrides;
using ModelContextProtocol.Protocol;
using Roll6.Mcp;

// Roll6 MCP server (020): a thin gateway exposing the REST API as tools for AI assistants. It holds no database or
// storage access — every tool calls the API (Roll6Api:BaseUrl) with the caller's own API key.
var builder = WebApplication.CreateBuilder(args);

var apiBaseUrl = builder.Configuration["Roll6Api:BaseUrl"];
if (string.IsNullOrWhiteSpace(apiBaseUrl))
    throw new InvalidOperationException("Configure Roll6Api:BaseUrl (env Roll6Api__BaseUrl), the address of the Roll6 API.");

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<Roll6ApiClient>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(100);
});
builder.Services.AddHttpClient(nameof(Roll6ApiClient), client => client.BaseAddress = new Uri(apiBaseUrl));

builder.Services.AddMcpServer(options =>
    {
        options.ServerInfo = new Implementation { Name = "roll6", Version = "1.0.0", Title = "Roll6 virtual tabletop" };
        options.ServerInstructions = Roll6Guide.INSTRUCTIONS;
    })
    .WithHttpTransport()
    .WithToolsFromAssembly(typeof(Roll6Guide).Assembly, McpToolRunner.JSON)
    .WithResourcesFromAssembly(typeof(Roll6Guide).Assembly);

// Behind the web container's nginx (and the server's proxy) in homolog/production.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.UseWhen(context => context.Request.Path.StartsWithSegments("/mcp"), branch => branch.UseMiddleware<ApiCredentialGate>());
app.MapMcp("/mcp");

app.Run();
