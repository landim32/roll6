using Roll6.API.Extensions;

namespace Roll6.API.Mcp;

/// <summary>The user behind an MCP call: the owner of the API key (019) or of the JWT — same as <c>CurrentUserId</c>.</summary>
public static class McpUser
{
    public static long Id(IHttpContextAccessor accessor) =>
        (accessor.HttpContext?.User ?? throw new UnauthorizedAccessException("Usuário não autenticado.")).GetUserId();
}
