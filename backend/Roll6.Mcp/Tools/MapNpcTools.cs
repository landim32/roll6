using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.MapNpc;

namespace Roll6.Mcp.Tools;

/// <summary>NPC occurrences on campaign maps (020). Mirrors MapNpcController: master only.</summary>
[McpServerToolType]
public static class MapNpcTools
{
    private const string RETURNS = """
        Returns: the occurrence { mapNpcId, mapId, npcId, mapTokenId (its piece), name, life, energy, status, tokenId,
        tokenImageUrl, x, y, currentMove (the occurrence's own Deslocamento), createdAt, updatedAt }.
        """;

    [McpServerTool(Name = "place_npc_on_map", Title = "Place NPC on map", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/mapnpc")]
    [Description($$"""
        What it does: places a new occurrence (instance) of a campaign NPC on a free hex of a campaign map, creating its
        piece (red disc). Each call creates another occurrence (e.g. three goblins) with its own name, status, current
        life/energy — starting at the NPC's totals — its own Deslocamento (currentMove, starting at the NPC's move) and its
        own turn. The name is the NPC's for the first occurrence on that map and "{name} N" (smallest free N ≥ 2 among the
        NPC's occurrences on the map) for the next ones: "Guarda", "Guarda 2", "Guarda 3". The piece reads these values
        (list_map_tokens: life/energy = current, totalLife/totalEnergy = the NPC's, move = currentMove, sheet = the NPC's sheet).
        Omit x and y to let the server place the piece on the free hex nearest to the middle of the map.
        Who can use it: only the master; the NPC must be in the campaign (add_npc_to_campaign).
        {{RETURNS}}
        Common errors: 403 not the master, 404 map/NPC not found, 409 NPC not in the campaign, a hex of the token's shape
        occupied or no free hex left on the map, 400 shape outside the grid.
        Related tools: list_campaign_npcs, list_map_tokens, move_map_token, update_map_npc.
        """)]
    public static Task<CallToolResult> PlaceNpcOnMap(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description("Id of the NPC (npcId from list_campaign_npcs).")] long npcId,
        [Description(McpDocs.X + " Omit together with y for the free hex nearest to the middle of the map.")] int? x = null,
        [Description(McpDocs.Y + " Omit together with x for the free hex nearest to the middle of the map.")] int? y = null,
        [Description(McpDocs.LOOK + " Omit for 0 (up).")] int? look = null) =>
        api.SendAsync(HttpMethod.Post, "/api/mapnpc", new MapNpcInsertInfo { MapId = mapId, NpcId = npcId, X = x, Y = y, Look = look });

    [McpServerTool(Name = "update_map_npc", Title = "Update NPC occurrence", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/mapnpc/{id}")]
    [Description($$"""
        What it does: changes one NPC occurrence on a map (name, current life/energy — may go to 0 or below, never above
        the NPC's totals — a free-text status like "stunned", optionally the posture: standing, down or out of combat,
        and optionally currentMove, the occurrence's own Deslocamento); the library NPC and the other occurrences are
        unchanged. Every change is logged in the turn. The piece and the NPC card
        show it at once for everyone; there is no need to touch the piece (update_map_token).
        Who can use it: the master; the player commanding an ally NPC (update_campaign_npc) may change only currentLife,
        currentEnergy, status and posture — name must stay the same and currentMove omitted or unchanged (else 403).
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found (or already removed from the map), 400 invalid name/status,
        current value above the total or negative currentMove.
        Related tools: list_map_npcs (mapNpcId).
        """)]
    public static Task<CallToolResult> UpdateMapNpc(
        Roll6ApiClient api,
        [Description("Id of the occurrence (mapNpcId from list_map_npcs or the piece's mapNpcId in list_map_tokens).")] long mapNpcId,
        [Description("Occurrence name (required, up to 260 characters). Example: \"Goblin 2\".")] string name,
        [Description("Current life of this occurrence, at most the NPC's life (totalLife); 0 or negative is allowed and does not change posture.")] int currentLife,
        [Description("Current energy of this occurrence, at most the NPC's energy (totalEnergy).")] int currentEnergy,
        [Description("Free-text status (up to 260 characters), e.g. \"stunned\". Null clears it.")] string? status = null,
        [Description(McpDocs.POSTURE_OPTIONAL)] int? posture = null,
        [Description("Deslocamento of this occurrence (movement points per turn, 0 or more). Omit to keep it.")] int? currentMove = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/mapnpc/{mapNpcId}", new MapNpcUpdateInfo
        {
            Name = name, CurrentLife = currentLife, CurrentEnergy = currentEnergy, Status = status, Posture = posture, CurrentMove = currentMove
        });

    [McpServerTool(Name = "delete_map_npc", Title = "Delete NPC occurrence", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/mapnpc/{id}")]
    [Description($$"""
        What it does: takes an NPC occurrence off the map: its piece is removed, the NPC stays in the campaign and the
        other occurrences stay where they are. What the occurrence did (moves, actions, changes) stays in the chat and
        the turn summary under its name. To remove the NPC and every occurrence from the campaign use
        remove_npc_from_campaign. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found (or already removed).
        Related tools: list_map_npcs, remove_npc_from_campaign.
        """)]
    public static Task<CallToolResult> DeleteMapNpc(
        Roll6ApiClient api,
        [Description("Id of the occurrence (mapNpcId).")] long mapNpcId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/mapnpc/{mapNpcId}");
}
