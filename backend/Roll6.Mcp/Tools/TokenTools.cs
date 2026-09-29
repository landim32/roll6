using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Token;

namespace Roll6.Mcp.Tools;

/// <summary>The shared token library (020): images used to draw pieces on maps. Mirrors TokenController.</summary>
[McpServerToolType]
public static class TokenTools
{
    private const string FIELDS = """
        Fields: name (required, up to 260), description, upSpace (hexes the standing token occupies: 1, 2, 3, 7 or 10,
        default 1), upImage (image of the token standing — required to draw it), downImage (optional image when lying
        down/fallen) and downSpace (hexes when down or out of combat: 1, 2, 3, 7 or 10; default 2 with a downImage, else
        none = the standing size). Shapes: 2 = the position + the hex behind; 3 = a line along the facing, position in
        the middle; 7 = the position + its 6 neighbors; 10 = a line of 4 along the facing (position 2nd from the front)
        + a line of 3 on each side. Any other size is refused (400).
        """;

    [McpServerTool(Name = "list_tokens", Title = "List tokens", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/token")]
    [Description("""
        What it does: lists the token library (images that draw pieces on maps), paged and searchable by name.
        Who can use it: any authenticated user (the library is shared).
        Returns: { items: [{ tokenId, userId, name, description, upSpace, downSpace, upImage, downImage, upImageUrl,
        downImageUrl, createdAt }], page, pageSize, totalCount }.
        Common errors: none.
        Related tools: create_token, add_object_to_map, create_npc (needs a tokenId), create_character (tokenId).
        """)]
    public static Task<CallToolResult> ListTokens(
        Roll6ApiClient api,
        [Description(McpDocs.PAGE)] int page = 1,
        [Description(McpDocs.PAGE_SIZE)] int pageSize = 20,
        [Description(McpDocs.SEARCH)] string? search = null,
        [Description(McpDocs.MINE)] bool mine = false) =>
        api.SendAsync(HttpMethod.Get, "/api/token", null, ("page", page), ("pageSize", pageSize), ("search", search), ("mine", mine));

    [McpServerTool(Name = "get_token", Title = "Get token", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/token/{id}")]
    [Description("""
        What it does: returns one token of the library.
        Who can use it: any authenticated user.
        Returns: the token (same fields as list_tokens items).
        Common errors: 404 token not found.
        Related tools: list_tokens, update_token.
        """)]
    public static Task<CallToolResult> GetToken(
        Roll6ApiClient api,
        [Description("Id of the token (tokenId from list_tokens).")] long tokenId) =>
        api.SendAsync(HttpMethod.Get, $"/api/token/{tokenId}");

    [McpServerTool(Name = "create_token", Title = "Create token", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/token")]
    [Description($$"""
        What it does: adds a token to the shared library; the current user becomes its creator.
        Who can use it: any authenticated user. Upload the images first with upload_image.
        {{FIELDS}}
        Returns: the created token.
        Common errors: 400 invalid name, negative spaces or image file names not returned by upload_image.
        Related tools: upload_image, add_object_to_map, create_npc.
        """)]
    public static Task<CallToolResult> CreateToken(
        Roll6ApiClient api,
        [Description("Token name (required, up to 260 characters). Example: \"Goblin archer\".")] string name,
        [Description("Optional free text describing the token.")] string? description = null,
        [Description("Hexes the standing token occupies: 1, 2, 3, 7 or 10. Default 1.")] int? upSpace = null,
        [Description("Hexes the token occupies when down or out of combat: 1, 2, 3, 7 or 10. Default 2 with downImage.")] int? downSpace = null,
        [Description("Image of the token standing. " + McpDocs.IMAGE_FILE)] string? upImage = null,
        [Description("Optional image of the token lying down (fallen). " + McpDocs.IMAGE_FILE)] string? downImage = null) =>
        api.SendAsync(HttpMethod.Post, "/api/token", new TokenInsertInfo
        {
            Name = name, Description = description, UpSpace = upSpace, DownSpace = downSpace, UpImage = upImage, DownImage = downImage
        });

    [McpServerTool(Name = "update_token", Title = "Update token", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/token/{id}")]
    [Description($$"""
        What it does: replaces all fields of a token (send the current values of the fields you don't want to change —
        read them with get_token first).
        Who can use it: only the user who created the token.
        {{FIELDS}}
        Returns: the updated token.
        Common errors: 403 not the creator, 404 not found, 400 invalid fields.
        Related tools: get_token.
        """)]
    public static Task<CallToolResult> UpdateToken(
        Roll6ApiClient api,
        [Description("Id of the token to change (tokenId).")] long tokenId,
        [Description("Token name (required, up to 260 characters).")] string name,
        [Description("Optional free text describing the token.")] string? description = null,
        [Description("Hexes the standing token occupies: 1, 2, 3, 7 or 10. Default 1.")] int? upSpace = null,
        [Description("Hexes the token occupies when down or out of combat: 1, 2, 3, 7 or 10. Default 2 with downImage.")] int? downSpace = null,
        [Description("Image of the token standing. " + McpDocs.IMAGE_FILE)] string? upImage = null,
        [Description("Optional image of the token lying down. " + McpDocs.IMAGE_FILE)] string? downImage = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/token/{tokenId}", new TokenInsertInfo
        {
            Name = name, Description = description, UpSpace = upSpace, DownSpace = downSpace, UpImage = upImage, DownImage = downImage
        });

    [McpServerTool(Name = "delete_token", Title = "Delete token", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/token/{id}")]
    [Description($$"""
        What it does: removes a token from the library. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the user who created the token.
        Returns: { ok: true }.
        Common errors: 403 not the creator, 404 not found, 409 in use (by pieces, characters or NPCs).
        Related tools: list_tokens (mine=true).
        """)]
    public static Task<CallToolResult> DeleteToken(
        Roll6ApiClient api,
        [Description("Id of the token to delete (tokenId).")] long tokenId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/token/{tokenId}");
}
