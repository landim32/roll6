using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Character;

namespace Roll6.Mcp.Tools;

/// <summary>Player characters (020). Mirrors CharacterController: only the owner reads and changes a character.</summary>
[McpServerToolType]
public static class CharacterTools
{
    private const string FIELDS = """
        Fields: name (required, up to 260), life and energy (TOTALS, 0 or more — the current values live in each campaign
        participation), move (movement points per turn, 0 or more), sheet (markdown), image (picture, from upload_image)
        and tokenId (library token that draws the character on maps; optional).
        """;

    [McpServerTool(Name = "list_my_characters", Title = "List my characters", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/character")]
    [Description("""
        What it does: lists all characters of the current user (not paged).
        Who can use it: any authenticated user; only his own characters are returned.
        Returns: [{ characterId, userId, name, sheet, life, energy, move, image, imageUrl, tokenId, tokenName, tokenImageUrl,
        createdAt, updatedAt }].
        Common errors: none.
        Related tools: create_character, request_campaign_access, list_my_participations.
        """)]
    public static Task<CallToolResult> ListMyCharacters(
        Roll6ApiClient api) =>
        api.SendAsync(HttpMethod.Get, "/api/character");

    [McpServerTool(Name = "search_characters", Title = "Search characters", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/character/search")]
    [Description("""
        What it does: searches the characters of all users by name — public data only (name, picture, owner), never sheets
        or stats. Used by masters to find a character to invite.
        Who can use it: any authenticated user.
        Returns: { items: [{ characterId, name, imageUrl, ownerId, ownerName }], page, pageSize, totalCount }.
        Common errors: none.
        Related tools: invite_character.
        """)]
    public static Task<CallToolResult> SearchCharacters(
        Roll6ApiClient api,
        [Description(McpDocs.PAGE)] int page = 1,
        [Description(McpDocs.PAGE_SIZE)] int pageSize = 20,
        [Description(McpDocs.SEARCH)] string? search = null) =>
        api.SendAsync(HttpMethod.Get, "/api/character/search", null, ("page", page), ("pageSize", pageSize), ("search", search));

    [McpServerTool(Name = "get_character", Title = "Get character", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/character/{id}")]
    [Description("""
        What it does: returns one character with its sheet and totals.
        Who can use it: only the owner (masters read campaign data with get_participation instead).
        Returns: the character (same fields as list_my_characters).
        Common errors: 403 not the owner, 404 not found.
        Related tools: update_character, get_participation.
        """)]
    public static Task<CallToolResult> GetCharacter(
        Roll6ApiClient api,
        [Description("Id of the character (characterId from list_my_characters).")] long characterId) =>
        api.SendAsync(HttpMethod.Get, $"/api/character/{characterId}");

    [McpServerTool(Name = "create_character", Title = "Create character", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/character")]
    [Description($$"""
        What it does: creates a character owned by the current user.
        Who can use it: any authenticated user.
        {{FIELDS}}
        Returns: the created character.
        Common errors: 400 invalid fields (e.g. negative life), 404 unknown tokenId.
        Related tools: upload_image, list_tokens, request_campaign_access.
        """)]
    public static Task<CallToolResult> CreateCharacter(
        Roll6ApiClient api,
        [Description("Character name (required, up to 260 characters). Example: \"Aria\".")] string name,
        [Description("Total life points (0 or more). Example: 10.")] int life,
        [Description("Total energy points (0 or more). Example: 5.")] int energy,
        [Description("Movement points per turn (0 or more): each step into the hex ahead and each 60° turn costs 1. Example: 5.")] int move,
        [Description(McpDocs.SHEET)] string? sheet = null,
        [Description("Character picture. " + McpDocs.IMAGE_FILE)] string? image = null,
        [Description("Optional library token that draws the character on maps (tokenId from list_tokens).")] long? tokenId = null) =>
        api.SendAsync(HttpMethod.Post, "/api/character", new CharacterInsertInfo
        {
            Name = name, Life = life, Energy = energy, Move = move, Sheet = sheet, Image = image, TokenId = tokenId
        });

    [McpServerTool(Name = "update_character", Title = "Update character", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/character/{id}")]
    [Description($$"""
        What it does: replaces all fields of a character (read it with get_character and send unchanged values back).
        Lowering life/energy totals also lowers the current values above them in every campaign.
        Who can use it: only the owner.
        {{FIELDS}}
        Returns: the updated character.
        Common errors: 403 not the owner, 404 not found, 400 invalid fields.
        Related tools: get_character, update_participation (campaign values).
        """)]
    public static Task<CallToolResult> UpdateCharacter(
        Roll6ApiClient api,
        [Description("Id of the character to change (characterId).")] long characterId,
        [Description("Character name (required, up to 260 characters).")] string name,
        [Description("Total life points (0 or more).")] int life,
        [Description("Total energy points (0 or more).")] int energy,
        [Description("Movement points per turn (0 or more).")] int move,
        [Description(McpDocs.SHEET)] string? sheet = null,
        [Description("Character picture. " + McpDocs.IMAGE_FILE)] string? image = null,
        [Description("Library token that draws the character on maps (tokenId). Null removes it.")] long? tokenId = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/character/{characterId}", new CharacterInsertInfo
        {
            Name = name, Life = life, Energy = energy, Move = move, Sheet = sheet, Image = image, TokenId = tokenId
        });

    [McpServerTool(Name = "delete_character", Title = "Delete character", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/character/{id}")]
    [Description($$"""
        What it does: deletes a character together with its participations in campaigns, its pieces on maps and its turn
        entries. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the owner.
        Returns: { ok: true }.
        Common errors: 403 not the owner, 404 not found.
        Related tools: list_my_characters.
        """)]
    public static Task<CallToolResult> DeleteCharacter(
        Roll6ApiClient api,
        [Description("Id of the character to delete (characterId).")] long characterId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/character/{characterId}");

    [McpServerTool(Name = "transfer_character", Title = "Transfer character", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("POST", "/api/character/{id}/transfer")]
    [Description($$"""
        What it does: hands one of your characters to another user, identified by the exact e-mail of the account. Only
        the owner changes: the character keeps its campaigns (and its status in each), current life/energy, campaign
        status and sheet, pieces on maps (same hex and facing) and turn entries. You lose every owner permission right
        away (edit, delete, move the piece, act); only the new owner can give it back. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the current owner.
        Returns: { ok: true }.
        Common errors: 400 invalid e-mail or the e-mail is your own, 403 not the owner, 404 character not found or
        "Usuário não encontrado." (no account with that e-mail), 409 the character changed owner meanwhile.
        Related tools: list_my_characters, get_character.
        """)]
    public static Task<CallToolResult> TransferCharacter(
        Roll6ApiClient api,
        [Description("Id of the character to transfer (characterId, from list_my_characters).")] long characterId,
        [Description("Exact e-mail of the user who will own the character (case and surrounding spaces are ignored).")] string email) =>
        api.SendAsync(HttpMethod.Post, $"/api/character/{characterId}/transfer", new CharacterTransferInfo { Email = email });
}
