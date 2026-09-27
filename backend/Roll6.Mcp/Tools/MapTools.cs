using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Map;

namespace Roll6.Mcp.Tools;

/// <summary>Campaign maps: a map model used in a campaign (020). Mirrors MapController.</summary>
[McpServerToolType]
public static class MapTools
{
    private const string RETURNS = """
        Returns: the map { mapId, campaignId, mapModelId, mapModelName, mapModelImageUrl, gridWidth, gridHeight, imageWidth,
        imageHeight, imageTop, imageLeft, hexSize, userId (master), sequence, name, status (1 active, 2 archived),
        createdAt, updatedAt }.
        """;

    [McpServerTool(Name = "get_map", Title = "Get map", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/map/{id}")]
    [Description($$"""
        What it does: returns one campaign map with its grid size (needed to know valid x/y for pieces).
        Who can use it: the master and approved participants of the campaign.
        {{RETURNS}}
        Common errors: 403 not allowed, 404 not found or deleted.
        Related tools: list_map_tokens, list_campaign_maps.
        """)]
    public static Task<CallToolResult> GetMap(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId) =>
        api.SendAsync(HttpMethod.Get, $"/api/map/{mapId}");

    [McpServerTool(Name = "add_map_to_campaign", Title = "Add map to campaign", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/map")]
    [Description($$"""
        What it does: adds a map model to a campaign as a new campaign map (named after the model plus a sequence number).
        Pieces are placed on campaign maps. Consider set_current_map afterwards so players follow it.
        Who can use it: only the master of the campaign (any map model can be used).
        {{RETURNS}}
        Common errors: 403 not the master, 404 campaign/map model not found.
        Related tools: list_map_models, create_map_model, set_current_map.
        """)]
    public static Task<CallToolResult> AddMapToCampaign(
        Roll6ApiClient api,
        [Description(McpDocs.CAMPAIGN_ID)] long campaignId,
        [Description("Id of the map model (mapModelId from list_map_models).")] long mapModelId) =>
        api.SendAsync(HttpMethod.Post, "/api/map", new MapInsertInfo { CampaignId = campaignId, MapModelId = mapModelId });

    [McpServerTool(Name = "update_map", Title = "Rename or archive map", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/map/{id}")]
    [Description($$"""
        What it does: renames a campaign map and sets its status: 1 active or 2 archived (archived maps stay listed and
        keep their pieces). To delete use delete_map.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found, 400 invalid name or status.
        Related tools: get_map.
        """)]
    public static Task<CallToolResult> UpdateMap(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description("Map name (required, up to 260 characters). Send the current name to keep it.")] string name,
        [Description("1 = active, 2 = archived.")] int status) =>
        api.SendAsync(HttpMethod.Put, $"/api/map/{mapId}", new MapUpdateInfo { Name = name, Status = status });

    [McpServerTool(Name = "delete_map", Title = "Delete map", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/map/{id}")]
    [Description($$"""
        What it does: deletes a campaign map (players with it open are sent away; if it was the current map, the campaign
        has none). {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master.
        Returns: { ok: true }.
        Common errors: 403 not the master, 404 not found.
        Related tools: list_campaign_maps.
        """)]
    public static Task<CallToolResult> DeleteMap(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/map/{mapId}");

    [McpServerTool(Name = "list_map_tokens", Title = "List map pieces", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/map/{id}/token")]
    [Description("""
        What it does: lists every piece on a campaign map with position and facing — the ids needed to move, act or reset.
        Who can use it: the master and approved participants.
        Returns: [{ mapTokenId, mapId, tokenId, tokenName, upImageUrl, downImageUrl, campaignCharacterId, characterId,
        mapNpcId, npcId, name, tokenType (1 Character, 2 Npc, 4 Object), sheet, life, energy, status, move, x, y, look,
        createdAt, updatedAt }]. Character pieces show the participation's current values; NPC pieces the occurrence's.
        Common errors: 403 not allowed, 404 map not found.
        Related tools: move_map_token, act_in_turn, reset_turn, get_map (grid size).
        """)]
    public static Task<CallToolResult> ListMapTokens(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId) =>
        api.SendAsync(HttpMethod.Get, $"/api/map/{mapId}/token");

    [McpServerTool(Name = "list_map_npcs", Title = "List map NPC occurrences", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/map/{id}/npc")]
    [Description("""
        What it does: lists the NPC occurrences placed on a campaign map, with their own name/life/energy/status.
        Who can use it: the master and approved participants.
        Returns: [{ mapNpcId, mapId, npcId, mapTokenId, name, life, energy, status, tokenId, tokenImageUrl, x, y, createdAt,
        updatedAt }].
        Common errors: 403 not allowed, 404 map not found.
        Related tools: update_map_npc, delete_map_npc, place_npc_on_map.
        """)]
    public static Task<CallToolResult> ListMapNpcs(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId) =>
        api.SendAsync(HttpMethod.Get, $"/api/map/{mapId}/npc");
}
