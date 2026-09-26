using System.Text;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
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
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // AppServices
        services.AddSingleton<IAmazonS3>(_ => S3ImageStorageAppService.CreateClient(s3Settings));
        services.AddScoped<IImageStorageAppService, S3ImageStorageAppService>();
        services.AddSingleton<IPasswordHasherService, PasswordHasherService>();
        services.AddSingleton<ITokenService, JwtTokenService>();

        // Domain Services
        services.AddScoped<IImageService, ImageService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IMapModelService, MapModelService>();
        services.AddScoped<ICampaignService, CampaignService>();
        services.AddScoped<IMapService, MapService>();
        services.AddScoped<ITokenLibraryService, TokenLibraryService>();
        services.AddScoped<IMapTokenService, MapTokenService>();
        services.AddScoped<ICharacterService, CharacterService>();
        services.AddScoped<ICampaignCharacterService, CampaignCharacterService>();
        services.AddScoped<INpcService, NpcService>();
        services.AddScoped<ICampaignNpcService, CampaignNpcService>();
        services.AddScoped<IMapNpcService, MapNpcService>();

        // Authentication
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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
            });
        services.AddAuthorization();

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
