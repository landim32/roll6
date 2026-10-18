using Roll6.DTO.Common;

namespace Roll6.Mcp;

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
    /// <summary>The library card's picture of a weapon or an animation (090).</summary>
    public const string THUMBNAIL_IMAGE = "The picture of its card in the app's library: a file name returned by upload_image (a square PNG reads best). Usually omitted — the site renders it itself when the item is saved or first listed. On updates: omit = keep, \"\" = remove; a new file, pose or content clears it unless sent in the same call.";
    public const string MODEL_CLIP = "Only with modelFile. Omit (or null) = automatic: a clip of the file named for that state (\"idle\"/\"parado\", \"walk\"/\"caminhar\", \"death\"/\"die\"/\"dead\"/\"morte\" for the down state), else none (Roll6 has no animation of its own; without a death the model is laid on its back). \"none\" = the model stays still; \"clip:{name}\" = the clip of the file with that exact name (see get_token / the web form for the names). A clip name the file lacks falls back to automatic. \"animation:{id}\" = a library animation (list_animations / create_animation, Mixamo skeletons only) whose type matches the state: modelIdleClip takes type 1 (Parado), modelWalkClip type 2 (Andando), modelDownClip type 5 (Derrotado) — another type or an unknown id is refused (400); it plays in full and may deform rigs that bind limbs to the hips.";
    /// <summary>The size of a token's 3D model (063).</summary>
    public const string TOKEN_WEAPON = "Weapons in the sockets of the 3D model (only with modelFile), one entry per socket: { socket, weaponId (from list_weapons / create_weapon), grip? }. socket: 1 right hand, 2 left hand, 3 back (behind the torso, diagonal, handle above the right shoulder), 4 right holster, 5 left holster (beside the hips, tip down). The 3D view aligns the weapon's grip point and standard pose (set on the weapon with update_weapon) to the socket, so normally only the size needs a value. grip (omit = default) = { scale: percent of the default size (the weapon's longest side = half the character's height), 10 to 400 in steps of 5; x, y, z, rx, ry, rz: the optional fine adjustment from the socket's own place — position in fractions of the character's height (-0.5 to 0.5) and rotation in degrees (-180 to 180, Euler XYZ) in the socket's frame (X = edge, Y = up, Z = face) }. The grip belongs to this token and socket. The same weapon may be in several sockets; the same socket only once. Omit the list = no weapon (update_token replaces the whole set). Needs a model with Mixamo bones (hands: RightHand / LeftHand; back: Spine2; holsters: Hips) to show. Errors: 400 weapons[i].socket (unknown or repeated), weapons[i].weaponId (not found), weapons[i].grip.{field} out of range.";
    public const string WEAPON_GRIP_POINT = "Where the hand holds the weapon (083): { x, y, z } as fractions of the file's bounding box, 0 to 1 each, in the file's own frame. Omit = the middle (0.5, 0.5, 0.5). The 3D view puts this point on the socket and turns and scales the weapon about it. 400 gripPoint.{x|y|z} outside 0…1.";
    public const string WEAPON_POSE = "Standard pose of the weapon (083): { rx, ry, rz } in whole degrees, Euler XYZ (-360 to 360 accepted, stored 0 to 359; the site turns it with 90° buttons and 1° sliders). After this rotation the file's model stands with its tip (\"cima\") along +Y, its edge or attack side (\"direita\") along +X and its outer face (\"frente\"; a shield's face, the side away from the body) along +Z — that is what every socket aligns. Omit = the file as is (0, 0, 0). 400 pose.{rx|ry|rz} outside -360…360.";
    public const string MODEL_SCALE = "Size of the 3D model in the 3D view, in percent of its automatic height (the height of the token's 2.5D figure silhouette for its number of hexes): 25 to 400 in steps of 5; omit (or 100) = the automatic height. Only with modelFile (without a model it is stored as 100). Only the 3D view uses it: the piece's hexes, movement and the 2D images do not change. Another value is refused (400 modelScale).";
    public const string SHEET = "Character sheet in markdown (free text, up to 20000 characters). Optional.";
    /// <summary>Campaign-side counterparts of <see cref="SHEET"/> and of the character's sheet file (032).</summary>
    public const string CAMPAIGN_SHEET = "Sheet of the character in this campaign, in markdown (up to 20000 characters): copied from the character's sheet when they joined, then changed only here. Send the current sheet (from get_participation) to keep it; null clears it.";
    public const string CAMPAIGN_SHEET_FILE_OPTIONAL = "Sheet file of this campaign (image or PDF): the fileName returned by upload_document, or the current sheetFile from get_participation to keep it. An empty string removes it; omitting it also keeps it.";

    public const string CAMPAIGN_ID = "Id of the campaign (campaignId from list_campaigns / get_campaign).";
    public const string SLUG = "URL slug (lowercase, from the name at creation; it never changes). Example: \"tormento-vil\".";
    public const string MAP_ID = "Id of the campaign map (mapId from list_campaign_maps or get_campaign.currentMapId).";
    public const string MAP_TOKEN_ID = "Id of the piece on the map (mapTokenId from list_map_tokens).";
    public const string PARTICIPATION_ID = "Id of the participation (campaignCharacterId from list_campaign_characters, list_my_participations or list_my_invites).";

    public const string POSTURE = "Posture: 1 standing, 2 down (lying, may take more hexes), 3 out of combat (lying and drawn in black and white).";
    public const string POSTURE_OPTIONAL = POSTURE + " Omit to keep the current posture.";
    public const string DESTRUCTIVE = "This cannot be undone: confirm with the user before calling it.";

    /// <summary>Same paging as the API's PageQuery.</summary>
    public static PageQuery Page(int page, int pageSize, string? search) => new()
    {
        Page = page,
        PageSize = pageSize,
        Search = string.IsNullOrWhiteSpace(search) ? null : search
    };
}
