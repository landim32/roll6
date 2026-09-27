using System.ComponentModel;
using ModelContextProtocol.Server;

namespace Roll6.Mcp;

/// <summary>The Roll6 guide as a tool, for clients that don't read resources (020).</summary>
[McpServerToolType]
public static class GuideTools
{
    [McpServerTool(Name = "get_roll6_guide", Title = "Roll6 guide", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [Description("""
        What it does: returns the Roll6 reference guide (markdown): roles (master, player, owner, approved participant),
        library vs campaign, participation statuses, the hex grid coordinates (x = column, y = row, look 0-5 clockwise
        from the top), movement cost, piece types, turns, campaign plan, images, paging, errors and common tool
        sequences.
        Who can use it: anyone. Call it once before using map, piece or turn tools.
        Returns: the guide as markdown text.
        Related tools: none (it describes all of them).
        """)]
    public static string GetRoll6Guide() => Roll6Guide.MARKDOWN;
}

/// <summary>The Roll6 guide as an MCP resource (020).</summary>
[McpServerResourceType]
public static class GuideResources
{
    [McpServerResource(UriTemplate = Roll6Guide.URI, Name = "roll6-guide", Title = "Roll6 guide", MimeType = "text/markdown")]
    [Description("Reference guide of the Roll6 domain for assistants: roles, hex coordinates, pieces, turns, plans and common tool flows.")]
    public static string Guide() => Roll6Guide.MARKDOWN;
}
