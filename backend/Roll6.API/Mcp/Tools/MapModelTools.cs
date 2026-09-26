using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.Domain.Interfaces;
using Roll6.DTO.MapModel;

namespace Roll6.API.Mcp.Tools;

/// <summary>Map models: the reusable image + hex grid layout (020). Mirrors MapModelController.</summary>
[McpServerToolType]
public static class MapModelTools
{
    private const string FIELDS = """
        Fields: name (required, up to 260), description, image (background from upload_image), gridWidth (hex columns) and
        gridHeight (hex rows) — each 1 to 500, default 20 × 20 — and the background placement under the fixed grid (hexes
        are 40 px from center to corner): imageWidth/imageHeight (display size in px, 1 to 20000, send both or neither; neither = natural size) and
        imageLeft/imageTop (offset in px, -20000 to 20000; negative values move the image right/down).
        """;

    private const string RETURNS = """
        Returns: { mapModelId, userId, name, description, image, imageUrl, gridWidth, gridHeight, imageWidth, imageHeight,
        imageTop, imageLeft, hexSize, createdAt, changedAt }.
        """;

    [McpServerTool(Name = "list_map_models", Title = "List map models", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/mapmodel")]
    [Description($$"""
        What it does: lists map models (image + grid layouts), from all users or only the current user's (mine=true), paged
        and searchable by name.
        Who can use it: any authenticated user.
        {{RETURNS}} (as items of { items, page, pageSize, totalCount })
        Common errors: none.
        Related tools: add_map_to_campaign, create_map_model.
        """)]
    public static Task<CallToolResult> ListMapModels(
        IMapModelService models, IHttpContextAccessor http,
        [Description(McpDocs.PAGE)] int page = 1,
        [Description(McpDocs.PAGE_SIZE)] int pageSize = 20,
        [Description(McpDocs.SEARCH)] string? search = null,
        [Description(McpDocs.MINE)] bool mine = false) =>
        McpToolRunner.RunAsync(() => models.ListAsync(McpDocs.Page(page, pageSize, search), mine ? McpUser.Id(http) : null));

    [McpServerTool(Name = "get_map_model", Title = "Get map model", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/mapmodel/{id}")]
    [Description($$"""
        What it does: returns one map model with its grid and image layout.
        Who can use it: any authenticated user.
        {{RETURNS}}
        Common errors: 404 not found.
        Related tools: update_map_model.
        """)]
    public static Task<CallToolResult> GetMapModel(
        IMapModelService models,
        [Description("Id of the map model (mapModelId from list_map_models or a campaign map's mapModelId).")] long mapModelId) =>
        McpToolRunner.RunAsync(() => models.GetByIdAsync(mapModelId));

    [McpServerTool(Name = "create_map_model", Title = "Create map model", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/mapmodel")]
    [Description($$"""
        What it does: creates a map model owned by the current user (to use it in a campaign: add_map_to_campaign).
        Who can use it: any authenticated user.
        {{FIELDS}}
        {{RETURNS}}
        Common errors: 400 invalid name, grid size or offsets.
        Related tools: upload_image, add_map_to_campaign.
        """)]
    public static Task<CallToolResult> CreateMapModel(
        IMapModelService models, IHttpContextAccessor http,
        [Description("Map name (required, up to 260 characters). Example: \"Goblin cave\".")] string name,
        [Description("Optional description of the map.")] string? description = null,
        [Description("Background image. " + McpDocs.IMAGE_FILE)] string? image = null,
        [Description("Number of hex columns of the grid, 1 to 500. Default 20.")] int? gridWidth = null,
        [Description("Number of hex rows of the grid, 1 to 500. Default 20.")] int? gridHeight = null,
        [Description("Display width of the background in px (1 to 20000). Send together with imageHeight, or omit both for the natural size.")] int? imageWidth = null,
        [Description("Display height of the background in px (1 to 20000). Send together with imageWidth, or omit both.")] int? imageHeight = null,
        [Description("Vertical offset of the background in px (-20000 to 20000; negative moves it down). Default 0.")] int? imageTop = null,
        [Description("Horizontal offset of the background in px (-20000 to 20000; negative moves it right). Default 0.")] int? imageLeft = null) =>
        McpToolRunner.RunAsync(() => models.CreateAsync(McpUser.Id(http), new MapModelInsertInfo
        {
            Name = name, Description = description, Image = image, GridWidth = gridWidth, GridHeight = gridHeight,
            ImageWidth = imageWidth, ImageHeight = imageHeight, ImageTop = imageTop, ImageLeft = imageLeft
        }));

    [McpServerTool(Name = "update_map_model", Title = "Update map model", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/mapmodel/{id}")]
    [Description($$"""
        What it does: replaces all fields of a map model (read it with get_map_model and send unchanged values back).
        Everyone with a campaign map of this model open sees the change at once.
        Who can use it: only the owner of the model.
        {{FIELDS}}
        {{RETURNS}}
        Common errors: 403 not the owner, 404 not found, 400 invalid values.
        Related tools: get_map_model.
        """)]
    public static Task<CallToolResult> UpdateMapModel(
        IMapModelService models, IHttpContextAccessor http,
        [Description("Id of the map model to change (mapModelId).")] long mapModelId,
        [Description("Map name (required, up to 260 characters).")] string name,
        [Description("Optional description of the map.")] string? description = null,
        [Description("Background image. " + McpDocs.IMAGE_FILE)] string? image = null,
        [Description("Number of hex columns of the grid, 1 to 500.")] int? gridWidth = null,
        [Description("Number of hex rows of the grid, 1 to 500.")] int? gridHeight = null,
        [Description("Display width of the background in px (1 to 20000); together with imageHeight.")] int? imageWidth = null,
        [Description("Display height of the background in px (1 to 20000); together with imageWidth.")] int? imageHeight = null,
        [Description("Vertical offset of the background in px (-20000 to 20000).")] int? imageTop = null,
        [Description("Horizontal offset of the background in px (-20000 to 20000).")] int? imageLeft = null) =>
        McpToolRunner.RunAsync(() => models.UpdateAsync(McpUser.Id(http), mapModelId, new MapModelInsertInfo
        {
            Name = name, Description = description, Image = image, GridWidth = gridWidth, GridHeight = gridHeight,
            ImageWidth = imageWidth, ImageHeight = imageHeight, ImageTop = imageTop, ImageLeft = imageLeft
        }));

    [McpServerTool(Name = "delete_map_model", Title = "Delete map model", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/mapmodel/{id}")]
    [Description($$"""
        What it does: deletes a map model. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the owner.
        Returns: { ok: true }.
        Common errors: 403 not the owner, 404 not found, 409 used by campaign maps.
        Related tools: list_map_models (mine=true).
        """)]
    public static Task<CallToolResult> DeleteMapModel(
        IMapModelService models, IHttpContextAccessor http,
        [Description("Id of the map model to delete (mapModelId).")] long mapModelId) =>
        McpToolRunner.RunAsync(() => models.DeleteAsync(McpUser.Id(http), mapModelId));
}
