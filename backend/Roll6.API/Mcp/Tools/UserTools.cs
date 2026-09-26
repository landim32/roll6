using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.Domain.Interfaces;

namespace Roll6.API.Mcp.Tools;

/// <summary>The current user (020). Registering, logging in and changing name/password need a human login.</summary>
[McpServerToolType]
public static class UserTools
{
    [McpServerTool(Name = "get_my_profile", Title = "Get my profile", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/user/me")]
    [Description("""
        What it does: returns the profile of the user this assistant acts for (the owner of the API key).
        Who can use it: any authenticated user.
        Returns: { userId, name, email }. Use userId to recognize what the user owns (campaign.userId = master,
        character.userId = owner).
        Common errors: none besides authentication.
        Related tools: list_campaigns (mine=true), list_my_characters.
        """)]
    public static Task<CallToolResult> GetMyProfile(IUserService users, IHttpContextAccessor http) =>
        McpToolRunner.RunAsync(() => users.GetMeAsync(McpUser.Id(http)));
}
