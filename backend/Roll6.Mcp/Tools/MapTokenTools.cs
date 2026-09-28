using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.MapToken;

namespace Roll6.Mcp.Tools;

/// <summary>Pieces on campaign maps (020). Mirrors MapTokenController.</summary>
[McpServerToolType]
public static class MapTokenTools
{
    private const string RETURNS = """
        Returns: the piece { mapTokenId, mapId, tokenId, tokenName, upImageUrl, campaignCharacterId, characterId, mapNpcId,
        npcId, name, tokenType (1 Character, 2 Npc, 4 Object), sheet, life, energy, status, move, x, y, look, … }.
        Character pieces show the participation's values; their sheet is the campaign notes, not the character sheet.
        """;

    [McpServerTool(Name = "add_object_to_map", Title = "Add object to map", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/maptoken")]
    [Description($$"""
        What it does: places an object piece (gray: a chest, a door, a tree…) on a free hex of a campaign map. Characters
        use place_character_on_map and NPCs place_npc_on_map instead.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 map/token not found, 409 hex occupied, 400 outside the grid or tokenType
        other than 4.
        Related tools: list_tokens, list_map_tokens, move_map_token.
        """)]
    public static Task<CallToolResult> AddObjectToMap(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description("Library token that draws the object (tokenId from list_tokens).")] long tokenId,
        [Description(McpDocs.X)] int x,
        [Description(McpDocs.Y)] int y,
        [Description("Piece name (up to 260 characters). Omit to use the token's name.")] string? name = null,
        [Description(McpDocs.LOOK + " Omit for 0 (up).")] int? look = null,
        [Description("Optional notes in markdown shown in the piece's sheet (up to 20000 characters).")] string? sheet = null,
        [Description("Optional free-text status (up to 260 characters).")] string? status = null,
        [Description("Life of the object (for breakable things); default 0.")] int life = 0,
        [Description("Energy of the object; default 0.")] int energy = 0,
        [Description("Movement points of the object; default 0 (objects move freely for the master).")] int move = 0) =>
        api.SendAsync(HttpMethod.Post, "/api/maptoken", new MapTokenInsertInfo
        {
            MapId = mapId, TokenId = tokenId, Name = name, TokenType = 4, Sheet = sheet, Life = life, Energy = energy,
            Status = status, Move = move, X = x, Y = y, Look = look
        });

    [McpServerTool(Name = "place_character_on_map", Title = "Place character on map", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/maptoken/character")]
    [Description($$"""
        What it does: places an approved character of the campaign on a free hex of a campaign map (blue piece). The piece
        uses the character's token; if the character has none, pass tokenId and it is also saved on the character.
        A character appears at most once per map.
        Who can use it: the master (any approved character) or the character's owner (own characters only); once on
        the map, players move it with move_map_token (turn and move limits apply).
        {{RETURNS}}
        Common errors: 403 neither the master nor the character's owner, 404 not found, 409 not approved / already on this map / hex occupied, 400 no
        token or outside the grid.
        Related tools: list_campaign_characters (campaignCharacterId, characterTokenId), move_map_token.
        """)]
    public static Task<CallToolResult> PlaceCharacterOnMap(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description(McpDocs.PARTICIPATION_ID + " Must be approved in the map's campaign.")] long campaignCharacterId,
        [Description(McpDocs.X)] int x,
        [Description(McpDocs.Y)] int y,
        [Description("Token to use only when the character has none (tokenId from list_tokens); ignored otherwise.")] long? tokenId = null) =>
        api.SendAsync(HttpMethod.Post, "/api/maptoken/character", new MapTokenCharacterInsertInfo
        {
            MapId = mapId, CampaignCharacterId = campaignCharacterId, TokenId = tokenId, X = x, Y = y
        });

    [McpServerTool(Name = "move_map_token", Title = "Move piece", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/maptoken/{id}/position")]
    [Description("""
        What it does: moves a piece on a campaign map to another hex and optionally turns it. For characters and NPC
        occurrences the move is recorded in the current turn (each moves once per turn) and everyone at the table sees it
        in real time.
        Who can use it: the master (any piece, any distance); a player only the piece of his own approved character, once
        per turn, within the character's move points.
        Coordinates: x = column, y = row of the rectangular flat-top hex grid (odd columns shifted half a hex down),
        0-based, inside gridWidth × gridHeight of the map. look = side the piece faces, 0-5 clockwise from the top side
        (0 up, 1 up-right, 2 down-right, 3 down, 4 down-left, 5 up-left).
        Cost (players): 1 per step into the hex ahead + 1 per 60° turn, shortest path around other pieces.
        Returns: the updated piece.
        Common errors: 409 hex occupied or already moved this turn, 400 beyond the move or outside the grid, 403 not
        your piece.
        Related tools: list_map_tokens (ids and positions), get_map (grid size), get_turn_state, reset_turn.
        """)]
    public static Task<CallToolResult> MoveMapToken(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_TOKEN_ID)] long mapTokenId,
        [Description("Destination column. " + McpDocs.X)] int x,
        [Description("Destination row. " + McpDocs.Y)] int y,
        [Description(McpDocs.LOOK_OPTIONAL)] int? look = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/maptoken/{mapTokenId}/position", new MapTokenPositionInfo { X = x, Y = y, Look = look });

    [McpServerTool(Name = "change_map_token_image", Title = "Change piece token", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/maptoken/{id}/token")]
    [Description($$"""
        What it does: changes the library token (image) that draws a piece; position and data are kept.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 piece/token not found.
        Related tools: list_tokens.
        """)]
    public static Task<CallToolResult> ChangeMapTokenImage(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_TOKEN_ID)] long mapTokenId,
        [Description("New library token (tokenId from list_tokens).")] long tokenId) =>
        api.SendAsync(HttpMethod.Put, $"/api/maptoken/{mapTokenId}/token", new MapTokenTokenInfo { TokenId = tokenId });

    [McpServerTool(Name = "update_map_token", Title = "Update piece", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/maptoken/{id}")]
    [Description($$"""
        What it does: replaces the stored data of a piece (name, type, sheet, life, energy, status, move, position,
        facing) without recording a turn move. Read it with list_map_tokens and send unchanged values back. Only object
        pieces display these stored values: character and NPC pieces always show the participation / NPC occurrence
        (name, current life/energy, status; totals, move and sheet from the character / NPC), so to change them use
        update_participation / update_map_npc — writing them here has no visible effect.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found, 409 hex occupied, 400 invalid values.
        Related tools: move_map_token (normal moves), list_map_tokens.
        """)]
    public static Task<CallToolResult> UpdateMapToken(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_TOKEN_ID)] long mapTokenId,
        [Description("Piece name (required, up to 260 characters).")] string name,
        [Description("Piece type: 1 Character, 2 Npc, 4 Object. Keep the current one.")] int tokenType,
        [Description(McpDocs.X)] int x,
        [Description(McpDocs.Y)] int y,
        [Description(McpDocs.LOOK_OPTIONAL)] int? look = null,
        [Description("Notes in markdown (up to 20000 characters).")] string? sheet = null,
        [Description("Free-text status (up to 260 characters).")] string? status = null,
        [Description("Life value stored on the piece.")] int life = 0,
        [Description("Energy value stored on the piece.")] int energy = 0,
        [Description("Movement points stored on the piece.")] int move = 0) =>
        api.SendAsync(HttpMethod.Put, $"/api/maptoken/{mapTokenId}", new MapTokenUpdateInfo
        {
            Name = name, TokenType = tokenType, Sheet = sheet, Life = life, Energy = energy, Status = status, Move = move,
            X = x, Y = y, Look = look
        });

    [McpServerTool(Name = "delete_map_token", Title = "Delete piece", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/maptoken/{id}")]
    [Description($$"""
        What it does: removes a piece from the map; an NPC piece takes its occurrence (and turn entries) with it; the
        library token is kept. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found.
        Related tools: list_map_tokens.
        """)]
    public static Task<CallToolResult> DeleteMapToken(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_TOKEN_ID)] long mapTokenId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/maptoken/{mapTokenId}");
}
