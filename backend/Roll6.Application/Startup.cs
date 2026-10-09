using Roll6.Application.Notifications;
using System.Text;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Roll6.Application.Auth;
using Roll6.Application.Realtime;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.DTO.Settings;
using Roll6.Infra.AppServices;
using Roll6.Infra.Context;
using Roll6.Infra.Interfaces.AppServices;
using Roll6.Infra.Interfaces.Repository;
using Roll6.Infra.Repository;

namespace Roll6.Application;

public static class Startup
{
    public const string CONNECTION_STRING_NAME = "Roll6Context";

    public static IServiceCollection ConfigureServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Columns are "timestamp without time zone" holding UTC values (research R4).
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        var jwtSettings = configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
        var s3Settings = configuration.GetSection("S3").Get<S3Settings>() ?? new S3Settings();
        services.Configure<JwtSettings>(configuration.GetSection("Jwt"));
        services.Configure<S3Settings>(configuration.GetSection("S3"));
        services.Configure<SiteSettings>(configuration.GetSection("Site"));
        services.Configure<PushSettings>(configuration.GetSection("Push"));

        // DbContext
        services.AddDbContext<Roll6Context>(options =>
            options.UseNpgsql(configuration.GetConnectionString(CONNECTION_STRING_NAME)));

        // Repositories
        services.AddScoped<IUserRepository<User>, UserRepository>();
        services.AddScoped<IMapModelRepository<MapModel>, MapModelRepository>();
        services.AddScoped<ICampaignRepository<Campaign>, CampaignRepository>();
        services.AddScoped<IMapRepository<Map>, MapRepository>();
        services.AddScoped<ITokenRepository<Token>, TokenRepository>();
        services.AddScoped<IMapTokenRepository<MapToken>, MapTokenRepository>();
        services.AddScoped<ICharacterRepository<Character>, CharacterRepository>();
        services.AddScoped<ICampaignCharacterRepository<CampaignCharacter>, CampaignCharacterRepository>();
        services.AddScoped<INpcRepository<Npc>, NpcRepository>();
        services.AddScoped<ICampaignNpcRepository<CampaignNpc>, CampaignNpcRepository>();
        services.AddScoped<IMapNpcRepository<MapNpc>, MapNpcRepository>();
        services.AddScoped<ITurnRepository<Turn>, TurnRepository>();
        services.AddScoped<IChatReadRepository<ChatRead>, ChatReadRepository>();
        services.AddScoped<IPushSubscriptionRepository<PushSubscription>, PushSubscriptionRepository>();
        services.AddScoped<IChatReactionRepository<ChatReaction>, ChatReactionRepository>();
        services.AddScoped<IChatPollRepository<ChatPollOption, ChatPollVote>, ChatPollRepository>();
        services.AddScoped<IUserNotificationRepository<UserNotification>, UserNotificationRepository>();
        services.AddScoped<ICampaignNotificationPrefRepository<CampaignNotificationPref>, CampaignNotificationPrefRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // AppServices
        services.AddSingleton<IAmazonS3>(_ => S3ImageStorageAppService.CreateClient(s3Settings));
        services.AddScoped<IImageStorageAppService, S3ImageStorageAppService>();
        // Link-preview pictures (040): rendered once per stored image and kept in memory (bounded by bytes).
        services.AddMemoryCache(options => options.SizeLimit = 32 * 1024 * 1024);
        services.AddScoped<IPreviewImageRenderer, SkiaPreviewImageRenderer>();
        services.AddSingleton<IPasswordHasherService, PasswordHasherService>();
        services.AddSingleton<ITokenService, JwtTokenService>();

        // Domain Services
        services.AddScoped<IImageService, ImageService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IMapModelService, MapModelService>();
        services.AddScoped<ICampaignService, CampaignService>();
        services.AddScoped<IMapService, MapService>();
        services.AddScoped<IPageMetaService, PageMetaService>();
        services.AddScoped<ITokenLibraryService, TokenLibraryService>();
        services.AddScoped<IMapTokenService, MapTokenService>();
        services.AddScoped<ICharacterService, CharacterService>();
        services.AddScoped<ICampaignCharacterService, CampaignCharacterService>();
        services.AddScoped<INpcService, NpcService>();
        services.AddScoped<ICampaignNpcService, CampaignNpcService>();
        services.AddScoped<IMapNpcService, MapNpcService>();
        // The turn log and the chat are one timeline (041): the same service answers both.
        services.AddScoped<TurnService>();
        services.AddScoped<ITurnService>(sp => sp.GetRequiredService<TurnService>());
        services.AddScoped<IChatService>(sp => sp.GetRequiredService<TurnService>());
        services.AddScoped<ICampaignPlanRepository<CampaignPlan>, CampaignPlanRepository>();
        services.AddScoped<ICampaignPlanService, CampaignPlanService>();
        services.AddScoped<IApiKeyRepository<ApiKey>, ApiKeyRepository>();
        services.AddScoped<IApiKeyService, ApiKeyService>();
        services.AddSingleton(TimeProvider.System);

        // Real-time table events (017): the hub only pushes; changes keep going through the REST API.
        services.AddSignalR();
        services.AddSingleton<TableConnections>();
        services.AddSingleton<IPresence>(sp => sp.GetRequiredService<TableConnections>());
        services.AddSingleton<SignalRRealtimeNotifier>();
        services.AddSingleton<IRealtimeNotifier>(sp => sp.GetRequiredService<SignalRRealtimeNotifier>());
        services.AddSingleton<INoticeChannel>(sp => sp.GetRequiredService<SignalRRealtimeNotifier>());

        // Web Push (043): notices are queued by the domain services and delivered in the background.
        services.AddSingleton<IPushSender, WebPushSender>();
        services.AddSingleton<NotificationQueue>();
        services.AddSingleton<INotificationQueue>(sp => sp.GetRequiredService<NotificationQueue>());
        services.AddScoped<NoticeDispatcher>();
        services.AddScoped<IPushService, PushService>();
        services.AddHostedService<NotificationWorker>();

        // Authentication
        // Authentication: the default scheme picks the API key (X-Api-Key header, 019) or the JWT per request, so
        // every [Authorize] accepts both with the same "sub" claim.
        services.AddAuthentication(AuthConstants.POLICY_SCHEME)
            .AddPolicyScheme(AuthConstants.POLICY_SCHEME, "JWT or API key", options =>
            {
                options.ForwardDefaultSelector = context =>
                    context.Request.Headers.ContainsKey(AuthConstants.API_KEY_HEADER)
                        ? AuthConstants.API_KEY_SCHEME
                        : JwtBearerDefaults.AuthenticationScheme;
            })
            .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(AuthConstants.API_KEY_SCHEME, null)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtSettings.Issuer,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                    NameClaimType = "name"
                };
                // Browsers can't send the Authorization header on WebSockets: the hub takes the token from the
                // query string, and only there.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var token = context.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(token) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                            context.Token = token;
                        return Task.CompletedTask;
                    }
                };
            });
        // Some operations need a logged-in user, never an API key (key management, name/password, the hub).
        services.AddAuthorization(options => options.AddPolicy(AuthConstants.SESSION_POLICY, policy => policy
            .RequireAuthenticatedUser()
            .RequireAssertion(context => !context.User.HasClaim(AuthConstants.AUTH_METHOD_CLAIM, AuthConstants.API_KEY_METHOD))));

        return services;
    }

    /// <summary>Applies pending EF Core migrations when "Database:ApplyMigrationsOnStartup" is true (Docker/Production).</summary>
    public static async Task ApplyMigrationsAsync(this IServiceProvider serviceProvider, IConfiguration configuration)
    {
        if (!configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
            return;

        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<Roll6Context>();
        await context.Database.MigrateAsync();
    }
}
