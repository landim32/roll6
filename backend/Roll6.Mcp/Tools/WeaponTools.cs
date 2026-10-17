using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Weapon;

namespace Roll6.Mcp.Tools;

/// <summary>
/// The weapon library (082): 3D models (.glb) shared by every user, held by tokens with a 3D model in their right and/or
/// left hand (rightWeapon / leftWeapon on create_token / update_token).
/// </summary>
[McpServerToolType]
public static class WeaponTools
{
    private const string WEAPON_ID = "Id of the weapon (weaponId from list_weapons or create_weapon).";
    private const string ITEM = "{ weaponId, userId, ownerName, name, modelFile, modelFileUrl, createdAt, updatedAt }";
    private const string MODEL_FILE = "The weapon's 3D model: the fileName returned by upload_token_model (\"{32 hex}.glb\", glTF 2.0 binary, ≤ 20 MB). Put the file's origin at the handle: that point goes to the middle of the palm.";

    [McpServerTool(Name = "create_weapon", Title = "Create weapon", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/weapon")]
    [Description($$"""
        What it does: adds a weapon to the shared library — a name and a 3D model uploaded first with upload_token_model.
        Tokens with a 3D model hold it in a hand (rightWeapon / leftWeapon on create_token / update_token); the 3D view of
        the web app hangs it on the model's Mixamo hand bone, so it follows every animation. Full rules: get_roll6_guide,
        section "Weapons".
        Who can use it: any authenticated user (the uploader becomes the owner).
        Returns: the weapon {{ITEM}}.
        Common errors: 400 name (required, ≤ 100 characters) or modelFile (not a name returned by upload_token_model).
        Related tools: upload_token_model, list_weapons, update_token, get_roll6_guide.
        """)]
    public static Task<CallToolResult> CreateWeapon(
        Roll6ApiClient api,
        [Description("Name shown in the library and in the token form (required, up to 100 characters). Example: \"Espada longa\".")] string name,
        [Description(MODEL_FILE)] string modelFile) =>
        api.SendAsync(HttpMethod.Post, "/api/weapon", new WeaponInsertInfo { Name = name, ModelFile = modelFile });

    [McpServerTool(Name = "list_weapons", Title = "List weapons", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/weapon")]
    [Description($$"""
        What it does: lists the weapon library, paged and searchable by name; the user's own weapons come first.
        Who can use it: any authenticated user (the library is shared).
        Returns: { items: [{{ITEM}}], page, pageSize, totalCount }.
        Common errors: none.
        Related tools: create_weapon, get_weapon, update_token (rightWeapon / leftWeapon).
        """)]
    public static Task<CallToolResult> ListWeapons(
        Roll6ApiClient api,
        [Description(McpDocs.PAGE)] int page = 1,
        [Description(McpDocs.PAGE_SIZE)] int pageSize = 20,
        [Description(McpDocs.SEARCH)] string? search = null,
        [Description(McpDocs.MINE)] bool mine = false) =>
        api.SendAsync(HttpMethod.Get, "/api/weapon", null,
            ("page", page), ("pageSize", pageSize), ("search", search), ("mine", mine));

    [McpServerTool(Name = "get_weapon", Title = "Get weapon", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/weapon/{id}")]
    [Description($$"""
        What it does: returns one weapon of the library.
        Who can use it: any authenticated user.
        Returns: {{ITEM}}.
        Common errors: 404 weapon not found.
        Related tools: list_weapons, update_weapon.
        """)]
    public static Task<CallToolResult> GetWeapon(
        Roll6ApiClient api,
        [Description(WEAPON_ID)] long weaponId) =>
        api.SendAsync(HttpMethod.Get, $"/api/weapon/{weaponId}");

    [McpServerTool(Name = "update_weapon", Title = "Update weapon", ReadOnly = false, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("PUT", "/api/weapon/{id}")]
    [Description($$"""
        What it does: renames a weapon and/or points it to a new 3D model. Send only what changes: a parameter left out
        keeps its current value. The weapon keeps its id, so every token holding it shows the new file at once (open
        tables reload their pieces); the previous file stays stored.
        Who can use it: only the owner.
        Returns: the weapon {{ITEM}}.
        Common errors: 400 name (empty or over 100 characters) or modelFile; 403 not the owner; 404 not found.
        Related tools: get_weapon, upload_token_model, list_weapons.
        """)]
    public static Task<CallToolResult> UpdateWeapon(
        Roll6ApiClient api,
        [Description(WEAPON_ID)] long weaponId,
        [Description("New name (up to 100 characters). Omit to keep the current one.")] string? name = null,
        [Description(MODEL_FILE + " Omit to keep the current file.")] string? modelFile = null) =>
        api.SendAsync(HttpMethod.Put, $"/api/weapon/{weaponId}", new WeaponUpdateInfo { Name = name, ModelFile = modelFile });

    [McpServerTool(Name = "delete_weapon", Title = "Delete weapon", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/weapon/{id}")]
    [Description($$"""
        What it does: removes a weapon from the library (its stored file is kept). {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the owner.
        Returns: { ok: true }.
        Common errors: 403 not the owner, 404 not found, 409 a token still holds it (take it out of the token's hands
        first with update_token).
        Related tools: list_weapons, update_token.
        """)]
    public static Task<CallToolResult> DeleteWeapon(
        Roll6ApiClient api,
        [Description(WEAPON_ID)] long weaponId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/weapon/{weaponId}");
}
