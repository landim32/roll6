using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Roll6.Domain.Interfaces;

namespace Roll6.Application.Auth;

/// <summary>
/// Authenticates requests carrying <c>X-Api-Key</c> (019) as the key's owner, with the same <c>sub</c> claim as the
/// JWT, so every existing <c>[Authorize]</c> and <c>CurrentUserId</c> work unchanged. Failures are generic.
/// </summary>
public class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IApiKeyService _apiKeyService;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IApiKeyService apiKeyService)
        : base(options, logger, encoder)
    {
        _apiKeyService = apiKeyService;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(AuthConstants.API_KEY_HEADER, out var values))
            return AuthenticateResult.NoResult();

        var identity = await _apiKeyService.AuthenticateAsync(values.ToString().Trim());
        if (identity == null)
            return AuthenticateResult.Fail("Invalid API key.");

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, identity.UserId.ToString()),
            new Claim("name", identity.UserName),
            new Claim(AuthConstants.AUTH_METHOD_CLAIM, AuthConstants.API_KEY_METHOD),
            new Claim(AuthConstants.API_KEY_ID_CLAIM, identity.ApiKeyId.ToString())
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, Scheme.Name, "name", ClaimTypes.Role));
        return AuthenticateResult.Success(new AuthenticationTicket(principal, Scheme.Name));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties) =>
        WriteProblemAsync(StatusCodes.Status401Unauthorized, "Chave de API inválida, expirada ou revogada.");

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties) =>
        WriteProblemAsync(StatusCodes.Status403Forbidden, "Esta operação exige login; chaves de API não são aceitas.");

    private async Task WriteProblemAsync(int status, string detail)
    {
        Response.StatusCode = status;
        await Response.WriteAsJsonAsync(new ProblemDetails { Status = status, Title = ReasonPhrase(status), Detail = detail },
            options: null, contentType: "application/problem+json");
    }

    private static string ReasonPhrase(int status) =>
        status == StatusCodes.Status401Unauthorized ? "Unauthorized" : "Forbidden";
}
