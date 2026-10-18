using System.ComponentModel;
using System.Text.Json;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Roll6.DTO.Animation;

namespace Roll6.Mcp.Tools;

/// <summary>
/// The animation library (059): <c>roll6-animation</c> JSON files moving a Mixamo skeleton, shared by every user and
/// chosen for a token's animation states as <c>animation:{id}</c>.
/// </summary>
[McpServerToolType]
public static class AnimationTools
{
    private const string TYPE = "Type of the animation: 1 Parado (idle), 2 Andando (walk), 3 Correndo (run), 4 Agachado (crouch), 5 Derrotado (defeated), 6 Atacando (attack), 7 Defendendo (defend). For now only 1, 2 and 5 can be chosen on tokens (Parado ← 1, Caminhando ← 2, Caído ← 5); the others are stored for states to come.";
    private const string ANIMATION_ID = "Id of the animation (animationId from list_animations or create_animation).";
    private const string ITEM = "{ animationId, userId, ownerName, name, type, duration, loop, fileUrl, thumbnailImage, thumbnailImageUrl, createdAt, updatedAt }";
    private const string CONTENT = "The animation file: the \"roll6-animation\" JSON object (or its text, which is parsed first).";

    [McpServerTool(Name = "create_animation", Title = "Create animation", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/animation")]
    [Description($$"""
        What it does: uploads an animation to the shared library. The content is a "roll6-animation" file (version 1):
        { format: "roll6-animation", version: 1, duration (seconds, ≤ 30), loop (true = cycle, false = played once and
        held on its last frame), tracks: [{ bone (Mixamo name without prefix, e.g. "RightArm"), times: [0, …, ≤ duration],
        degrees: [[x, y, z] per time] }], hipsLift?: { times, values, of?: "height" | "hips" } } — turns in degrees in the
        character's frame (+X its left, +Y up, +Z forward) on top of the rest pose. Full rules, bones, signs and an example:
        get_roll6_guide, section "Animations". The file is validated before it is stored; the owner may replace it later
        with update_animation (name, type and/or content) or update_animation_content.
        Who can use it: any authenticated user (the uploader becomes the owner).
        Returns: the animation {{ITEM}}. To use it on a token, send modelIdleClip / modelWalkClip / modelDownClip =
        "animation:{animationId}" in create_token / update_token (the type must match the state: 1 / 2 / 5).
        Common errors: 400 with the problem's key — content (not an object, over 1 MB), content.format, content.version,
        content.duration, content.loop, content.tracks, content.tracks[i].bone (unknown or repeated bone), .times, .degrees,
        content.hipsLift…; name (required, ≤ 100 characters); type (1–7).
        Related tools: list_animations, get_animation_content, update_animation_content, update_token, get_roll6_guide.
        """)]
    public static async Task<CallToolResult> CreateAnimation(
        Roll6ApiClient api,
        [Description("Name shown in the library and in the token form (required, up to 100 characters). Example: \"Golpe de machado\".")] string name,
        [Description(TYPE)] int type,
        [Description(CONTENT)] JsonElement content,
        [Description(McpDocs.THUMBNAIL_IMAGE)] string? thumbnailImage = null)
    {
        if (!TryReadContent(content, out var document, out var failure))
            return failure!;
        return await api.SendAsync(HttpMethod.Post, "/api/animation", new AnimationInsertInfo { Name = name, Type = type, Content = document, ThumbnailImage = thumbnailImage });
    }

    [McpServerTool(Name = "list_animations", Title = "List animations", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/animation")]
    [Description($$"""
        What it does: lists the animation library, paged, searchable by name and filterable by type; the user's own
        animations come first.
        Who can use it: any authenticated user (the library is shared).
        Returns: { items: [{{ITEM}}], page, pageSize, totalCount }.
        Common errors: none.
        Related tools: create_animation, get_animation_content, update_token (modelIdleClip "animation:{id}").
        """)]
    public static Task<CallToolResult> ListAnimations(
        Roll6ApiClient api,
        [Description(McpDocs.PAGE)] int page = 1,
        [Description(McpDocs.PAGE_SIZE)] int pageSize = 20,
        [Description(McpDocs.SEARCH)] string? search = null,
        [Description(McpDocs.MINE)] bool mine = false,
        [Description("Optional type filter (1–7). " + TYPE)] int? type = null) =>
        api.SendAsync(HttpMethod.Get, "/api/animation", null,
            ("page", page), ("pageSize", pageSize), ("search", search), ("mine", mine), ("type", type));

    [McpServerTool(Name = "get_animation", Title = "Get animation", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/animation/{id}")]
    [Description($$"""
        What it does: returns one animation of the library (without its file — see get_animation_content).
        Who can use it: any authenticated user.
        Returns: {{ITEM}}.
        Common errors: 404 animation not found.
        Related tools: list_animations, get_animation_content.
        """)]
    public static Task<CallToolResult> GetAnimation(
        Roll6ApiClient api,
        [Description(ANIMATION_ID)] long animationId) =>
        api.SendAsync(HttpMethod.Get, $"/api/animation/{animationId}");

    [McpServerTool(Name = "get_animation_content", Title = "Get animation content", ReadOnly = true, Idempotent = true, Destructive = false, OpenWorld = false)]
    [ApiOperation("GET", "/api/animation/{id}/file")]
    [Description("""
        What it does: returns the animation's file — the "roll6-animation" JSON — so it can be read, studied or adapted
        into a new animation (create_animation) or changed and sent back (update_animation or update_animation_content, owner only).
        Who can use it: any authenticated user.
        Returns: the JSON document { format, version, duration, loop, tracks, hipsLift? … }.
        Common errors: 404 animation (or its file) not found.
        Related tools: get_animation, create_animation, update_animation, update_animation_content.
        """)]
    public static Task<CallToolResult> GetAnimationContent(
        Roll6ApiClient api,
        [Description(ANIMATION_ID)] long animationId) =>
        api.SendAsync(HttpMethod.Get, $"/api/animation/{animationId}/file");

    [McpServerTool(Name = "update_animation", Title = "Update animation", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]
    [ApiOperation("PUT", "/api/animation/{id}")]
    [Description($$"""
        What it does: changes an animation — its name, its type and/or its file — in one call. Send only what changes: a
        parameter left out keeps its current value. A content replaces the file exactly like update_animation_content
        (same id, so every token that uses "animation:{id}" plays the new version; duration and loop are read again from
        the new file; the previous file is removed and cannot be recovered — read it first with get_animation_content to
        keep a copy). {{McpDocs.DESTRUCTIVE}} Everything is validated before anything is saved: an invalid field changes
        nothing.
        Who can use it: only the owner.
        Returns: the animation {{ITEM}}.
        Common errors: 400 name (empty or over 100 characters), type (1–7) or content with the problem's key — content (not
        an object, over 1 MB), content.format, content.version, content.duration, content.loop, content.tracks,
        content.tracks[i].bone, .times, .degrees, content.hipsLift…; 403 not the owner, 404 not found, 409 the type cannot
        change while a token uses the animation in the state of its current type.
        Related tools: get_animation, get_animation_content, list_animations, update_animation_content, get_roll6_guide.
        """)]
    public static async Task<CallToolResult> UpdateAnimation(
        Roll6ApiClient api,
        [Description(ANIMATION_ID)] long animationId,
        [Description("New name (up to 100 characters). Omit to keep the current one.")] string? name = null,
        [Description(TYPE + " Omit to keep the current one.")] int? type = null,
        [Description(CONTENT + " Omit to keep the current file.")] JsonElement? content = null,
        [Description(McpDocs.THUMBNAIL_IMAGE)] string? thumbnailImage = null)
    {
        JsonElement? document = null;
        if (content is { ValueKind: not (JsonValueKind.Undefined or JsonValueKind.Null) } given)
        {
            if (!TryReadContent(given, out var parsed, out var failure))
                return failure!;
            document = parsed;
        }
        return await api.SendAsync(HttpMethod.Put, $"/api/animation/{animationId}",
            new AnimationUpdateInfo { Name = name, Type = type, Content = document, ThumbnailImage = thumbnailImage });
    }

    [McpServerTool(Name = "update_animation_content", Title = "Update animation content", ReadOnly = false, Idempotent = true, Destructive = true, OpenWorld = false)]
    [ApiOperation("PUT", "/api/animation/{id}/content")]
    [Description($$"""
        What it does: replaces the file of an animation with a new "roll6-animation" content (same rules as
        create_animation), keeping its id, name, type and owner — so every token that uses "animation:{id}" plays the new
        version. Duration and loop are read again from the new file; the previous file is removed and cannot be recovered
        (read it first with get_animation_content to keep a copy). {{McpDocs.DESTRUCTIVE}} update_animation does the same and
        can also change the name and the type in the same call.
        Who can use it: only the owner.
        Returns: the animation {{ITEM}}.
        Common errors: 400 with the problem's key — content (not an object, over 1 MB), content.format, content.version,
        content.duration, content.loop, content.tracks, content.tracks[i].bone, .times, .degrees, content.hipsLift…;
        403 not the owner, 404 not found.
        Related tools: get_animation_content, update_animation, create_animation, get_roll6_guide.
        """)]
    public static async Task<CallToolResult> UpdateAnimationContent(
        Roll6ApiClient api,
        [Description(ANIMATION_ID)] long animationId,
        [Description(CONTENT)] JsonElement content,
        [Description(McpDocs.THUMBNAIL_IMAGE)] string? thumbnailImage = null)
    {
        if (!TryReadContent(content, out var document, out var failure))
            return failure!;
        return await api.SendAsync(HttpMethod.Put, $"/api/animation/{animationId}/content", new AnimationContentInfo { Content = document, ThumbnailImage = thumbnailImage });
    }

    [McpServerTool(Name = "delete_animation", Title = "Delete animation", ReadOnly = false, Idempotent = false, Destructive = true, OpenWorld = false)]
    [ApiOperation("DELETE", "/api/animation/{id}")]
    [Description($$"""
        What it does: removes an animation from the library, file included. {{McpDocs.DESTRUCTIVE}}
        Who can use it: only the owner.
        Returns: { ok: true }.
        Common errors: 403 not the owner, 404 not found, 409 in use by a token (change the token's animation first).
        Related tools: list_animations, update_token.
        """)]
    public static Task<CallToolResult> DeleteAnimation(
        Roll6ApiClient api,
        [Description(ANIMATION_ID)] long animationId) =>
        api.SendAsync(HttpMethod.Delete, $"/api/animation/{animationId}");

    /// <summary>The content as a JSON document: an object as is, a string parsed first (assistants often send the text).</summary>
    private static bool TryReadContent(JsonElement content, out JsonElement document, out CallToolResult? failure)
    {
        document = content;
        failure = null;
        if (content.ValueKind != JsonValueKind.String)
            return true;
        try
        {
            document = JsonDocument.Parse(content.GetString() ?? string.Empty).RootElement.Clone();
            return true;
        }
        catch (JsonException ex)
        {
            failure = McpToolRunner.Failure(400, "Bad Request", $"content is not valid JSON: {ex.Message}",
                new Dictionary<string, string[]> { ["content"] = new[] { "O arquivo não é um JSON válido." } });
            return false;
        }
    }
}
