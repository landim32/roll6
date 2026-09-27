using System.ComponentModel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace Roll6.Mcp.Tools;

/// <summary>Image upload (020): the same storage and limits as POST /api/image, with the file sent as base64.</summary>
[McpServerToolType]
public static class ImageTools
{
    private static readonly Dictionary<string, string> CONTENT_TYPES = new(StringComparer.OrdinalIgnoreCase)
    {
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".webp"] = "image/webp"
    };

    [McpServerTool(Name = "upload_image", Title = "Upload image", ReadOnly = false, Idempotent = false, Destructive = false, OpenWorld = false)]
    [ApiOperation("POST", "/api/image")]
    [Description("""
        What it does: stores an image (map background, token art, character or NPC picture, plan illustration) and returns
        its file name, to be saved in other entities.
        Who can use it: any authenticated user.
        Returns: { fileName, url }. Save fileName (e.g. "3f2a…c9.png") in fields like image, upImage, downImage; url is
        temporary (expires) — never store it. In campaign plan markdown write ![caption](roll6-image:{fileName}).
        Common errors: 400 invalid base64, unsupported type (only png, jpg, webp) or larger than 10 MB.
        Related tools: create_token, create_character, create_npc, create_map_model, create_campaign_plan.
        """)]
    public static async Task<CallToolResult> UploadImage(
        Roll6ApiClient api,
        [Description("Original file name, used to infer the type from the extension (.png, .jpg, .jpeg, .webp). Example: \"goblin.png\".")] string fileName,
        [Description("File content encoded in base64 (a data: URL prefix is accepted). Up to 10 MB of binary content.")] string contentBase64,
        [Description("MIME type (image/png, image/jpeg or image/webp). Optional: inferred from fileName when omitted.")] string? contentType = null)
    {
        byte[] bytes;
        try
        {
            var raw = contentBase64.Trim();
            var comma = raw.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ? raw.IndexOf(',') : -1;
            bytes = Convert.FromBase64String(comma >= 0 ? raw[(comma + 1)..] : raw);
        }
        catch (FormatException)
        {
            // Same shape and message as the API's validation errors.
            return McpToolRunner.Failure(400, "One or more validation errors occurred.",
                errors: new Dictionary<string, string[]> { ["file"] = new[] { "O conteúdo não é um base64 válido." } });
        }
        var type = !string.IsNullOrWhiteSpace(contentType)
            ? contentType
            : CONTENT_TYPES.GetValueOrDefault(Path.GetExtension(fileName ?? string.Empty));
        return await api.PostFileAsync("/api/image", bytes, fileName ?? "image", type);
    }
}
