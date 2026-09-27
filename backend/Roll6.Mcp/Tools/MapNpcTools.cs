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
        tokenImageUrl, x, y, createdAt, updatedAt }.
        """;

    [McpServerTool(Name = "place_npc_on_map", Title = "Place NPC on map", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/mapnpc")]
    [Description($$"""
        What it does: places a new occurrence of a campaign NPC on a free hex of a campaign map, creating its piece (red
        disc). Each call creates another occurrence (e.g. three goblins) with its own name/life/energy copied from the NPC
        and its own turn.
        Who can use it: only the master; the NPC must be in the campaign (add_npc_to_campaign).
        {{RETURNS}}
        Common errors: 403 not the master, 404 map/NPC not found, 409 NPC not in the campaign or hex occupied, 400 outside
        the grid.
        Related tools: list_campaign_npcs, list_map_tokens, move_map_token, update_map_npc.
        """)]
    public static Task<CallToolResult> PlaceNpcOnMap(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description("Id of the NPC (npcId from list_campaign_npcs).")] long npcId,
        [Description(McpDocs.X)] int x,
        [Description(McpDocs.Y)] int y,
        [Description(McpDocs.LOOK + " Omit for 0 (up).")] int? look = null) =>
        api.SendAsync(HttpMethod.Post, "/api/mapnpc", new MapNpcInsertInfo { MapId = mapId, NpcId = npcId, X = x, Y = y, Look = look });

    [McpServerTool(Name = "update_map_npc", Title = "Update NPC occurrence", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/mapnpc/{id}")]
    [Description($$"""
        What it does: changes one NPC occurrence on a map (name, current life/energy — may go to 0 or below — and a
        free-text status like "stunned"); the library NPC is unchanged. The piece shows it at once for everyone.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found, 400 invalid name/status.
        Related tools: list_map_npcs (mapNpcId).
        """)]
    public static Task<CallToolResult> UpdateMapNpc(
        Roll6ApiClient api,
        [Description("Id of the occurrence (mapNpcId from list_map_npcs or the piece's mapNpcId in list_map_tokens).")] long mapNpcId,
        [Description("Occurrence name (required, up to 260 characters). Example: \"Goblin 2\".")] string name,
        [Description("Current life of this occurrence; 0 or negative = fallen.")] int life,
        [Description("Current energy of this occurrence.")] int energy,
        [Description("Free-text status (up to 260 characters), e.g. \"stunned\". Null clears it.")] string? status = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/mapnpc/{mapNpcId}", new MapNpcUpdateInfo { Name = name, Life = life, Energy = energy, Status = status });

    [McpServerTool(Name = "delete_map_npc", Title = "Delete NPC occurrence", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/mapnpc/{id}")]
    [Description($$"""
        What it does: removes an NPC occurrence and its piece from the map (and its turn entries). {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found.
        Related tools: list_map_npcs.
        """)]
    public static Task<CallToolResult> DeleteMapNpc(
        Roll6ApiClient api,
        [Description("Id of the occurrence (mapNpcId).")] long mapNpcId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/mapnpc/{mapNpcId}");
}
