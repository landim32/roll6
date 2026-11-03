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
        imageHeight, imageTop, imageLeft, hexSize, userId (master), sequence, name, slug (immutable URL slug),
        status (1 active, 2 archived, 4 current — the one map the players follow), createdAt, updatedAt }.
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

    [McpServerTool(Name = "get_map_by_slug", Title = "Get map by slug", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/map/slug/{slug}")]
    [Description($$"""
        What it does: returns one campaign map by its URL slug, including archived maps, with the grid size needed for x/y.
        Who can use it: the master and approved participants of the map's campaign.
        {{RETURNS}}
        Common errors: 403 not allowed, 404 slug not found or the map is deleted.
        Related tools: get_map, get_campaign_by_slug, list_map_tokens.
        """)]
    public static Task<CallToolResult> GetMapBySlug(
        Roll6ApiClient api,
        [Description(McpDocs.SLUG)] string slug) =>
        api.SendAsync(HttpMethod.Get, $"/api/map/slug/{slug}");

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
        keep their pieces). The current map (status 4) is made only by set_current_map: status 4 here is refused, the
        current map can't be archived (make another map current first) and 1 on it keeps it current. To delete use
        delete_map.
        Who can use it: only the master.
        {{RETURNS}}
        Common errors: 403 not the master, 404 not found, 400 invalid name or status ("Use “Tornar atual” para tornar um
        mapa atual.", "Torne outro mapa atual antes de arquivar este.").
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

    private const string MARK_KINDS = "1 Wall (Parede), 2 Stone (Pedra), 3 Hole (Buraco), 4 Water (Água), 5 Fire (Fogo), 6 Entrance (Entrada), 7 Mark (Marcação — a red X that may carry a text)";

    private const string DRAWING_RETURNS = """
        { mapDrawingId, kind (1 Rectangle, 2 Circle, 3 Pencil, 4 Line, 5 Arrow), points ([[x, y], …] in map pixels),
        color (#rrggbb), width, opacity, userId, createdAt }
        """;

    [McpServerTool(Name = "get_map_paint", Title = "Get map paint", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/map/{id}/paint")]
    [Description($$"""
        What it does: returns the paint of a campaign map (107): the painted hexes (terrain and marks) and the drawings
        (rectangles, circles, pencil strokes, lines, arrows). Marks are informative only: no movement rule reads them.
        Hexes painted outside the current grid are left out.
        Who can use it: the master and approved participants of the campaign.
        Returns: { mapId, marks: [{ x, y, kind ({{MARK_KINDS}}), text (only for 7) }], drawings: [{{DRAWING_RETURNS}}] }
        (drawings oldest first; the newest is drawn on top).
        Common errors: 403 not allowed, 404 map not found or deleted.
        Related tools: get_hex_content, set_hex_marks, add_map_drawing, get_map.
        """)]
    public static Task<CallToolResult> GetMapPaint(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId) =>
        api.SendAsync(HttpMethod.Get, $"/api/map/{mapId}/paint");

    [McpServerTool(Name = "set_hex_marks", Title = "Paint map hexes", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/map/{id}/hex-marks")]
    [Description($$"""
        What it does: paints or clears up to 200 hexes of a campaign map at once (107), all or nothing. Each hex keeps one
        mark; painting it again replaces the mark. Kinds: {{MARK_KINDS}}. Marks are informative for the table (terrain,
        a chest, a trap): they do not block or slow pieces. Everyone at the table sees the change live.
        Who can use it: only the master, while the campaign is active (or being prepared).
        Returns: { mapId, marks: [the painted hexes { x, y, kind, text }], removedHexes: [{ x, y } actually cleared],
        drawing: null, deletedDrawingId: null, cleared: false }.
        Common errors: 400 marks (empty or more than 200), marks[i].x ("O hex está fora do mapa." / "Hex repetido."),
        marks[i].kind (not 1-7), marks[i].text (over 100 characters or text on a kind other than 7); 403 not the master
        ("Apenas o mestre pinta o mapa."); 404 map not found; 409 campaign paused or finished.
        Related tools: get_map_paint, get_hex_content, clear_map_paint, get_map.
        """)]
    public static Task<CallToolResult> SetHexMarks(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description("The hexes, 1 to 200, each once: [{ x (column), y (row), kind (1-7, or null to clear the hex), text (only with kind 7, up to 100 characters, e.g. \"Baú\") }]. Example: [{ \"x\": 4, \"y\": 7, \"kind\": 4 }, { \"x\": 5, \"y\": 7, \"kind\": 7, \"text\": \"Baú\" }, { \"x\": 6, \"y\": 7, \"kind\": null }].")] List<MapHexMarkWriteInfo> marks) =>
        api.SendAsync(HttpMethod.Put, $"/api/map/{mapId}/hex-marks", new MapHexMarksInfo { Marks = marks });

    [McpServerTool(Name = "add_map_drawing", Title = "Draw on map", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/map/{id}/drawing")]
    [Description($$"""
        What it does: adds a drawing (outline only) to a campaign map (107), in map pixels: the grid starts at (0, 0) and
        the middle of hex (x, y) is at (40 + 60·x, 34.64 + 69.28·y, plus 34.64 when x is odd). Kinds: 1 Rectangle (two
        opposite corners), 2 Circle (center + a point on the circle), 3 Pencil (2 to 2000 points), 4 Line and 5 Arrow
        (start + end; the arrow head is at the end). At most 500 drawings per map.
        Who can use it: only the master, while the campaign is active (or being prepared).
        Returns: the drawing {{DRAWING_RETURNS}}.
        Common errors: 400 kind, points (wrong count, more than 20000 px outside the grid, or "O desenho é pequeno
        demais."), color (#rrggbb), width (1-200), opacity (0.05-1); 403 not the master; 404 map not found; 409 campaign
        paused or finished, or "O mapa já tem o máximo de 500 desenhos.".
        Related tools: delete_map_drawing, get_map_paint, clear_map_paint.
        """)]
    public static Task<CallToolResult> AddMapDrawing(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description("1 Rectangle, 2 Circle, 3 Pencil, 4 Line, 5 Arrow.")] int kind,
        [Description("Points in map pixels as [[x, y], …] of whole numbers: exactly 2 for kinds 1, 2, 4 and 5; 2 to 2000 for the pencil. Example: [[120, 80], [400, 260]].")] List<int[]> points,
        [Description("Line color as #rrggbb. Example: \"#e03131\".")] string color,
        [Description("Line width in map pixels, 1 to 200. Example: 4.")] int width,
        [Description("Opacity from 0.05 (almost invisible) to 1 (solid). Default 1.")] double opacity = 1) =>
        api.SendAsync(HttpMethod.Post, $"/api/map/{mapId}/drawing", new MapDrawingInsertInfo
        {
            Kind = kind,
            Points = points,
            Color = color,
            Width = width,
            Opacity = opacity
        });

    [McpServerTool(Name = "delete_map_drawing", Title = "Erase map drawing", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/map/{id}/drawing/{drawingId}")]
    [Description($$"""
        What it does: erases one drawing of a campaign map (107). {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master, while the campaign is active (or being prepared).
        Returns: { ok: true }.
        Common errors: 403 not the master; 404 map not found or "Desenho não encontrado." (also a drawing of another
        map); 409 campaign paused or finished.
        Related tools: get_map_paint, add_map_drawing.
        """)]
    public static Task<CallToolResult> DeleteMapDrawing(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description("Id of the drawing (mapDrawingId from get_map_paint or add_map_drawing).")] long drawingId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/map/{mapId}/drawing/{drawingId}");

    [McpServerTool(Name = "clear_map_paint", Title = "Clear map paint", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/map/{id}/paint")]
    [Description($$"""
        What it does: removes every painted hex and every drawing of a campaign map (107); the image, grid and pieces
        stay. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the master, while the campaign is active (or being prepared).
        Returns: { ok: true }.
        Common errors: 403 not the master; 404 map not found; 409 campaign paused or finished.
        Related tools: get_map_paint, set_hex_marks.
        """)]
    public static Task<CallToolResult> ClearMapPaint(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/map/{mapId}/paint");

    [McpServerTool(Name = "get_hex_content", Title = "Get hex content", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/map/{id}/hex")]
    [Description($$"""
        What it does: tells what is on one hex of a campaign map (107): its painted mark (terrain or a mark with text)
        and every piece whose shape covers it — a big piece centered on another hex is listed too. Drawings are not
        part of it.
        Who can use it: the master and approved participants of the campaign.
        Returns: { mapId, x, y, inside: true, mark: { x, y, kind ({{MARK_KINDS}}), text } or null, pieces: [{ mapTokenId,
        name (the character's / NPC instance's / object's), tokenType (1 Character, 2 Npc, 4 Object), campaignCharacterId,
        characterId, mapNpcId, posture (1 standing, 2 down, 3 out of combat; null for objects), x, y (the piece's own
        position) }] ordered by mapTokenId }.
        Common errors: 400 x "O hex está fora do mapa."; 403 not allowed; 404 map not found.
        Related tools: get_map_paint, list_map_tokens, get_map.
        """)]
    public static Task<CallToolResult> GetHexContent(
        Roll6ApiClient api,
        [Description(McpDocs.MAP_ID)] long mapId,
        [Description(McpDocs.X)] int x,
        [Description(McpDocs.Y)] int y) =>
        api.SendAsync(HttpMethod.Get, $"/api/map/{mapId}/hex", null, ("x", x), ("y", y));
}
