using Roll6.DTO.Common;

namespace Roll6.API.Mcp;

/// <summary>Parameter descriptions shared by many tools (020), so they are written — and fixed — once.</summary>
public static class McpDocs
{
    public const string PAGE = "Page number, starting at 1. Default 1.";
    public const string PAGE_SIZE = "Items per page, 1 to 100. Default 20.";
    public const string SEARCH = "Optional text; only items whose name contains it (case-insensitive). Omit to list all.";
    public const string MINE = "true = only items created by the current user; false (default) = the whole shared library.";

    public const string X = "Column of the hex (0-based), from 0 to gridWidth - 1 of the map. Example: 2.";
    public const string Y = "Row of the hex (0-based), from 0 to gridHeight - 1 of the map. Example: 3.";
    public const string LOOK = "Side the piece faces, 0-5 clockwise from the top: 0 up, 1 up-right, 2 down-right, 3 down, 4 down-left, 5 up-left.";
    public const string LOOK_OPTIONAL = LOOK + " Omit to keep the current facing.";

    public const string IMAGE_FILE = "File name returned by upload_image ({32 hex}.png|jpg|webp). Not a URL. Omit or null for no image.";
    public const string SHEET = "Character sheet in markdown (free text, up to 20000 characters). Optional.";

    public const string CAMPAIGN_ID = "Id of the campaign (campaignId from list_campaigns / get_campaign).";
    public const string MAP_ID = "Id of the campaign map (mapId from list_campaign_maps or get_campaign.currentMapId).";
    public const string MAP_TOKEN_ID = "Id of the piece on the map (mapTokenId from list_map_tokens).";
    public const string PARTICIPATION_ID = "Id of the participation (campaignCharacterId from list_campaign_characters, list_my_participations or list_my_invites).";

    public const string DESTRUCTIVE = "This cannot be undone: confirm with the user before calling it.";

    /// <summary>Same paging as the API's PageQuery.</summary>
    public static PageQuery Page(int page, int pageSize, string? search) => new()
    {
        Page = page,
        PageSize = pageSize,
        Search = string.IsNullOrWhiteSpace(search) ? null : search
    };
}
