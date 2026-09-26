using System.Text.Encodings.Web;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Roll6.Application.Auth;
using Roll6.Domain.Interfaces;

namespace Roll6.Tests.Application;

public class ApiKeyAuthenticationHandlerTests
{
    private const string VALID = "r6_valid-key-0123456789";
    private readonly Mock<IApiKeyService> _apiKeyService = new();

    public ApiKeyAuthenticationHandlerTests()
    {
        _apiKeyService.Setup(s => s.AuthenticateAsync(It.IsAny<string?>())).ReturnsAsync((ApiKeyIdentity?)null);
        _apiKeyService.Setup(s => s.AuthenticateAsync(VALID)).ReturnsAsync(new ApiKeyIdentity(7, 42, "Ana"));
    }

    private async Task<AuthenticateResult> Authenticate(string? headerValue)
    {
        var options = new Mock<IOptionsMonitor<AuthenticationSchemeOptions>>();
        options.Setup(o => o.Get(It.IsAny<string>())).Returns(new AuthenticationSchemeOptions());
        var handler = new ApiKeyAuthenticationHandler(options.Object, NullLoggerFactory.Instance, UrlEncoder.Default, _apiKeyService.Object);
        var context = new DefaultHttpContext();
        if (headerValue != null)
            context.Request.Headers[AuthConstants.API_KEY_HEADER] = headerValue;
        await handler.InitializeAsync(
            new AuthenticationScheme(AuthConstants.API_KEY_SCHEME, null, typeof(ApiKeyAuthenticationHandler)), context);
        return await handler.AuthenticateAsync();
    }

    [Fact]
    public async Task WithoutTheHeader_HasNoResult()
    {
        (await Authenticate(null)).None.Should().BeTrue();
        _apiKeyService.Verify(s => s.AuthenticateAsync(It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task InvalidKey_Fails()
    {
        var result = await Authenticate("r6_wrong-key-0123456789");

        result.Succeeded.Should().BeFalse();
        result.Failure.Should().NotBeNull();
    }

    [Fact]
    public async Task ValidKey_AuthenticatesAsTheOwnerMarkedAsApiKey()
    {
        var result = await Authenticate($"  {VALID}  ");

        result.Succeeded.Should().BeTrue();
        var user = result.Principal!;
        user.FindFirst("sub")!.Value.Should().Be("7");
        user.FindFirst("name")!.Value.Should().Be("Ana");
        user.HasClaim(AuthConstants.AUTH_METHOD_CLAIM, AuthConstants.API_KEY_METHOD).Should().BeTrue();
        user.FindFirst(AuthConstants.API_KEY_ID_CLAIM)!.Value.Should().Be("42");
    }
}
