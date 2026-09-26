using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.OpenApi.Models;
using ModelContextProtocol.Protocol;
using Roll6.API.Mcp;
using Roll6.Application;
using Roll6.Application.Realtime;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureServices(builder.Configuration);
builder.Services.AddRouting(options => options.LowercaseUrls = true);
builder.Services.AddControllers();

// MCP server (020): the API's operations as tools for AI assistants, at /mcp (Streamable HTTP), acting as the
// owner of the API key (019) or JWT. Tools call the same domain services as the controllers.
builder.Services.AddHttpContextAccessor();
builder.Services.AddMcpServer(options =>
    {
        options.ServerInfo = new Implementation { Name = "roll6", Version = "1.0.0", Title = "Roll6 virtual tabletop" };
        options.ServerInstructions = Roll6Guide.INSTRUCTIONS;
    })
    .WithHttpTransport()
    .WithToolsFromAssembly(typeof(Roll6Guide).Assembly, McpToolRunner.JSON)
    .WithResourcesFromAssembly(typeof(Roll6Guide).Assembly);
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Roll6 API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    // API keys (019): X-Api-Key header instead of the JWT.
    options.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Name = "X-Api-Key",
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Header,
        Description = "Chave de API gerada no menu do usuário (r6_…)."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        },
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "ApiKey" } },
            Array.Empty<string>()
        }
    });
});

// The reverse proxy (Caddy) terminates SSL in Production and forwards the original scheme/client IP.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
        options.AddPolicy("AllowFrontend", policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
}

var app = builder.Build();

await app.Services.ApplyMigrationsAsync(app.Configuration);

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Docker"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsDevelopment())
{
    app.UseCors("AllowFrontend");
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<TableHub>("/hubs/table");
app.MapMcp("/mcp").RequireAuthorization();

app.Run();
