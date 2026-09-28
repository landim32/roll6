using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Turn;

namespace Roll6.Mcp.Tools;

/// <summary>Turn entries (020). Mirrors TurnController; reading the turn and finishing it are campaign tools.</summary>
[McpServerToolType]
public static class TurnTools
{
    private const string ENTRY = """
        Returns: the entry { turnId, campaignId, mapId, turnNo, turnType (1 Movement, 2 Action, 3 ActionResult),
        characterId, npcId, mapNpcId, actorName, beforeX, beforeY, beforeLook, x, y, look, description, createdAt }.
        """;

    [McpServerTool(Name = "act_in_turn", Title = "Act in turn", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/turn/action")]
    [Description($$"""
        What it does: records an action (free text, e.g. "attacks the goblin with the sword") for a piece's character or
        NPC occurrence in the current turn. It shows as a speech balloon over the piece and turns its status green; a
        piece may act several times per turn.
        Who can use it: a player for the piece of his own approved character; the master for any character or NPC piece.
        Objects can't act.
        {{ENTRY}}
        Common errors: 403 not your piece / NPC by a player, 400 empty text (up to 2000 characters) or object piece, 404 not
        found.
        Related tools: list_map_tokens (mapTokenId), get_turn_state.
        """)]
    public static Task<CallToolResult> ActInTurn(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_TOKEN_ID + " Must be a character or NPC piece.")] long mapTokenId,
        [Description("What the piece does, in plain text (required, up to 2000 characters). Example: \"Casts a fireball at the orcs\".")] string description) =>
        api.SendAsync(HttpMethod.Post, "/api/turn/action", new TurnActInfo { MapTokenId = mapTokenId, Description = description });

    [McpServerTool(Name = "get_turn_summary", Title = "Get turn summary", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/campaign/{id}/turn/summary")]
    [Description("""
        What it does: returns everything that happened in a turn as readable markdown (Portuguese), ready to paste in a chat
        or a campaign log: "## Ações" (moves with from/to, facing and movement points spent, actions in quotes, the master's
        results, and every change to characters/NPCs with who made it and the values before and after) and "## Posições"
        (where each character and NPC piece of the turn's map is and where it looks).
        Who can use it: the campaign master or a player with an approved character in the campaign.
        Returns: { campaignId, turnNo, markdown }. Without turnNo it is the turn in progress.
        Common errors: 400 turnNo below 1 or above the current turn, 403 no access to the campaign, 404 campaign not found.
        Related tools: get_turn_state, list_turn_entries, finish_turn.
        """)]
    public static Task<CallToolResult> GetTurnSummary(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Turn number (1 up to the current turn). Omit it for the turn in progress.")] int? turnNo = null) =>
        api.SendAsync(HttpMethod.Get, $"/api/campaign/{campaignId}/turn/summary", null, ("turnNo", turnNo));

    [McpServerTool(Name = "reset_turn", Title = "Reset piece turn", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("POST", "/api/turn/reset")]
    [Description($$"""
        What it does: deletes the move and the action of a piece's character/NPC occurrence in the current turn (changes to
        its life/energy/status stay in the log) and moves the piece back to where it was before its move (if that hex is
        still free) — so it can move and act again. {{McpDocs.DESTRUCTIVE}}
        Who can use it: a player for his own approved character's piece; the master for any character or NPC piece.
        Returns: { removed (entries deleted), reverted (false when the former hex was taken and the piece stayed) }.
        Common errors: 403 not your piece, 400 object piece, 404 not found.
        Related tools: get_turn_state.
        """)]
    public static Task<CallToolResult> ResetTurn(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_TOKEN_ID)] long mapTokenId) =>
        api.SendAsync(HttpMethod.Post, "/api/turn/reset", new TurnPieceInfo { MapTokenId = mapTokenId });

    [McpServerTool(Name = "create_turn_entry", Title = "Create turn entry", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/turn")]
    [Description($$"""
        What it does: writes a turn entry directly — the only way to record an ActionResult (turn type 3, e.g. "the goblin
        takes 4 damage"). Also accepts Movement (1, with before/after positions) and Action (2). Exactly one of
        characterId / npcId must be given (mapNpcId only together with npcId).
        Who can use it: only the master.
        {{ENTRY}}
        Common errors: 403 not the master, 400 invalid type, missing actor or positions, text too long.
        Related tools: get_turn_state, delete_turn_entry.
        """)]
    public static Task<CallToolResult> CreateTurnEntry(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("1 Movement, 2 Action, 3 ActionResult.")] int turnType,
        [Description("Character the entry belongs to (characterId). Give this or npcId.")] long? characterId = null,
        [Description("Library NPC the entry belongs to (npcId). Give this or characterId.")] long? npcId = null,
        [Description("NPC occurrence on a map (mapNpcId), only together with npcId. Optional.")] long? mapNpcId = null,
        [Description("Text of an Action or ActionResult (required for those, up to 2000 characters).")] string? description = null,
        [Description("Turn number; omit for the turn in progress.")] int? turnNo = null,
        [Description("Map where it happened (mapId). Optional.")] long? mapId = null,
        [Description("Movement only: column before the move.")] int? beforeX = null,
        [Description("Movement only: row before the move.")] int? beforeY = null,
        [Description("Movement only: facing before the move (0-5).")] int? beforeLook = null,
        [Description("Movement only: column after the move.")] int? x = null,
        [Description("Movement only: row after the move.")] int? y = null,
        [Description("Movement only: facing after the move (0-5).")] int? look = null) =>
        api.SendAsync(HttpMethod.Post, "/api/turn", new TurnInsertInfo
        {
            CampaignId = campaignId, TurnType = turnType, CharacterId = characterId, NpcId = npcId, MapNpcId = mapNpcId,
            Description = description, TurnNo = turnNo, MapId = mapId, BeforeX = beforeX, BeforeY = beforeY,
            BeforeLook = beforeLook, X = x, Y = y, Look = look
        });

    [McpServerTool(Name = "delete_turn_entry", Title = "Delete turn entry", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/turn/{id}")]
    [Description($$"""
        What it does: deletes one turn entry (it does not move pieces back — use reset_turn for that).
        {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found.
        Related tools: get_turn_state, list_turn_entries (turnId).
        """)]
    public static Task<CallToolResult> DeleteTurnEntry(
        Roll6ApiClient api,
        [Description("Id of the entry (turnId from get_turn_state or list_turn_entries).")] long turnId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/turn/{turnId}");
}
