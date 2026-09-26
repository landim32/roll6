using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Turn;

namespace Roll6.API.Mcp.Tools;

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
        ITurnService turns, IHttpContextAccessor http,
        [Description(McpDocs.MAP_TOKEN_ID + " Must be a character or NPC piece.")] long mapTokenId,
        [Description("What the piece does, in plain text (required, up to 2000 characters). Example: \"Casts a fireball at the orcs\".")] string description) =>
        McpToolRunner.RunAsync(() => turns.ActAsync(McpUser.Id(http), new TurnActInfo { MapTokenId = mapTokenId, Description = description }));

    [McpServerTool(Name = "reset_turn", Title = "Reset piece turn", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("POST", "/api/turn/reset")]
    [Description($$"""
        What it does: deletes all entries of a piece's character/NPC occurrence in the current turn and moves the piece back
        to where it was before its move (if that hex is still free) — so it can move and act again. {{McpDocs.DESTRUCTIVE}}
        Who can use it: a player for his own approved character's piece; the master for any character or NPC piece.
        Returns: { removed (entries deleted), reverted (false when the former hex was taken and the piece stayed) }.
        Common errors: 403 not your piece, 400 object piece, 404 not found.
        Related tools: get_turn_state.
        """)]
    public static Task<CallToolResult> ResetTurn(
        ITurnService turns, IHttpContextAccessor http,
        [Description(McpDocs.MAP_TOKEN_ID)] long mapTokenId) =>
        McpToolRunner.RunAsync(() => turns.ResetAsync(McpUser.Id(http), new TurnPieceInfo { MapTokenId = mapTokenId }));

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
        ITurnService turns, IHttpContextAccessor http,
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
        McpToolRunner.RunAsync(() => turns.CreateAsync(McpUser.Id(http), new TurnInsertInfo
        {
            CampaignId = campaignId, TurnType = turnType, CharacterId = characterId, NpcId = npcId, MapNpcId = mapNpcId,
            Description = description, TurnNo = turnNo, MapId = mapId, BeforeX = beforeX, BeforeY = beforeY,
            BeforeLook = beforeLook, X = x, Y = y, Look = look
        }));

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
        ITurnService turns, IHttpContextAccessor http,
        [Description("Id of the entry (turnId from get_turn_state or list_turn_entries).")] long turnId) =>
        McpToolRunner.RunAsync(() => turns.DeleteAsync(McpUser.Id(http), turnId));
}
