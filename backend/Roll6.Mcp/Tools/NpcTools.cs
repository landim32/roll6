using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Npc;

namespace Roll6.Mcp.Tools;

/// <summary>The master's NPC library (020). Mirrors NpcController: each NPC is read and changed only by its owner.</summary>
[McpServerToolType]
public static class NpcTools
{
    private const string FIELDS = """
        Fields: tokenId (required: library token that draws the NPC on maps), name (required, up to 260), life, energy
        and move (base values, 0 or more; each map occurrence copies them and can change its own), status (free text up
        to 260, e.g. "wounded"; copied to each new map occurrence), sheet (markdown) and image (picture from upload_image).
        """;

    [McpServerTool(Name = "list_my_npcs", Title = "List my NPCs", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/npc")]
    [Description("""
        What it does: lists the NPCs of the current user's library, paged and searchable by name.
        Who can use it: any authenticated user; only his own NPCs.
        Returns: { items: [{ npcId, userId, tokenId, tokenName, tokenImageUrl, name, life, energy, move, sheet, status, image,
        imageUrl, createdAt, updatedAt }], page, pageSize, totalCount }.
        Common errors: none.
        Related tools: create_npc, add_npc_to_campaign.
        """)]
    public static Task<CallToolResult> ListMyNpcs(
        Roll6ApiClient api,
        [Description(McpDocs.PAGE)] int page = 1,
        [Description(McpDocs.PAGE_SIZE)] int pageSize = 20,
        [Description(McpDocs.SEARCH)] string? search = null) =>
        api.SendAsync(HttpMethod.Get, "/api/npc", null, ("page", page), ("pageSize", pageSize), ("search", search));

    [McpServerTool(Name = "get_npc", Title = "Get NPC", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/npc/{id}")]
    [Description("""
        What it does: returns one NPC of the current user's library.
        Who can use it: only the owner.
        Returns: the NPC (same fields as list_my_npcs items).
        Common errors: 403 not the owner, 404 not found.
        Related tools: update_npc.
        """)]
    public static Task<CallToolResult> GetNpc(
        Roll6ApiClient api,
        [Description("Id of the NPC (npcId from list_my_npcs).")] long npcId) =>
        api.SendAsync(HttpMethod.Get, $"/api/npc/{npcId}");

    [McpServerTool(Name = "create_npc", Title = "Create NPC", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/npc")]
    [Description($$"""
        What it does: creates an NPC in the current user's library (to use it in a campaign: add_npc_to_campaign, then
        place_npc_on_map).
        Who can use it: any authenticated user.
        {{FIELDS}}
        Returns: the created NPC.
        Common errors: 400 missing token/name or negative values, 404 unknown tokenId.
        Related tools: list_tokens, upload_image, add_npc_to_campaign.
        """)]
    public static Task<CallToolResult> CreateNpc(
        Roll6ApiClient api,
        [Description("Library token that draws the NPC on maps (tokenId from list_tokens). Required.")] long tokenId,
        [Description("NPC name (required, up to 260 characters). Example: \"Goblin\".")] string name,
        [Description("Base life points (0 or more). Example: 7.")] int life,
        [Description("Base energy points (0 or more). Example: 2.")] int energy,
        [Description("Base movement points per turn (0 or more). Example: 6.")] int move,
        [Description("NPC sheet in markdown (up to 20000 characters). Optional.")] string? sheet = null,
        [Description("NPC picture. " + McpDocs.IMAGE_FILE)] string? image = null,
        [Description("Free-text status (up to 260 characters), e.g. \"wounded\". Optional.")] string? status = null) =>
        api.SendAsync(HttpMethod.Post, "/api/npc", new NpcInsertInfo
        {
            TokenId = tokenId, Name = name, Life = life, Energy = energy, Move = move, Sheet = sheet, Image = image, Status = status
        });

    [McpServerTool(Name = "update_npc", Title = "Update NPC", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/npc/{id}")]
    [Description($$"""
        What it does: replaces all fields of a library NPC (read it with get_npc and send unchanged values back).
        Occurrences already placed on maps keep their own name/life/energy/status (change them with update_map_npc).
        Who can use it: only the owner.
        {{FIELDS}}
        Returns: the updated NPC.
        Common errors: 403 not the owner, 404 not found, 400 invalid fields.
        Related tools: get_npc, update_map_npc.
        """)]
    public static Task<CallToolResult> UpdateNpc(
        Roll6ApiClient api,
        [Description("Id of the NPC to change (npcId).")] long npcId,
        [Description("Library token that draws the NPC on maps (tokenId). Required.")] long tokenId,
        [Description("NPC name (required, up to 260 characters).")] string name,
        [Description("Base life points (0 or more).")] int life,
        [Description("Base energy points (0 or more).")] int energy,
        [Description("Base movement points per turn (0 or more).")] int move,
        [Description("NPC sheet in markdown (up to 20000 characters). Optional.")] string? sheet = null,
        [Description("NPC picture. " + McpDocs.IMAGE_FILE)] string? image = null,
        [Description("Free-text status (up to 260 characters); send the current one to keep it, null clears it.")] string? status = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/npc/{npcId}", new NpcInsertInfo
        {
            TokenId = tokenId, Name = name, Life = life, Energy = energy, Move = move, Sheet = sheet, Image = image, Status = status
        });

    [McpServerTool(Name = "delete_npc", Title = "Delete NPC", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/npc/{id}")]
    [Description($$"""
        What it does: deletes an NPC from the library. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the owner.
        Returns: { ok: true }.
        Common errors: 403 not the owner, 404 not found, 409 the NPC is in a campaign (remove_npc_from_campaign first).
        Related tools: remove_npc_from_campaign.
        """)]
    public static Task<CallToolResult> DeleteNpc(
        Roll6ApiClient api,
        [Description("Id of the NPC to delete (npcId).")] long npcId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/npc/{npcId}");
}
