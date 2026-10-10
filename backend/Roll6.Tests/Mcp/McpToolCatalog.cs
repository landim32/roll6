using System.ComponentModel;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using ModelContextProtocol.Server;
using Roll6.API.Controllers;
using Roll6.Mcp;

namespace Roll6.Tests.Mcp;

/// <summary>Reflection helpers shared by the MCP tests: the API operations (Roll6.API) and the MCP tools (Roll6.Mcp).</summary>
public static class McpToolCatalog
{
    public static readonly Assembly API = typeof(ApiControllerBase).Assembly;
    public static readonly Assembly MCP = typeof(Roll6Guide).Assembly;

    /// <summary>Operations that need a human login session (019) and are not exposed as tools.</summary>
    public static readonly HashSet<string> EXCLUDED = new()
    {
        "POST /api/user",
        "POST /api/user/login",
        "PUT /api/user/name",
        "PUT /api/user/password",
        "GET /api/apikey",
        "POST /api/apikey",
        "POST /api/apikey/{id}/revoke",
        "DELETE /api/apikey/{id}",
        // 029: image bytes for the browser's map snapshot; assistants already get the presigned URLs.
        "GET /api/image/file/{fileName}",
        // 041: the reader's mark (UI state) and the browser's audio recording upload.
        "PUT /api/campaign/{id}/chat/read",
        "POST /api/chat/audio",
        // 043: browser-only Web Push subscription (login session, not for assistants).
        "GET /api/push/key",
        "POST /api/push/subscription",
        "DELETE /api/push/subscription",
        // Marking the bell's notices as read is UI state (assistants list them with list_my_notifications).
        "PUT /api/push/inbox/read",
        // 040: link previews for crawlers (anonymous HTML fragment and picture), not for assistants.
        "GET /api/meta/head/{**path}",
        "GET /api/meta/image/map/{slug}.jpg"
    };

    public record Tool(MethodInfo Method, McpServerToolAttribute Attribute, string Name, string Description, ApiOperationAttribute? Operation);

    /// <summary>Every controller action as "VERB /api/route" with route constraints removed.</summary>
    public static List<string> ApiOperations() => API.GetTypes()
        .Where(t => t.IsSubclassOf(typeof(ControllerBase)) && !t.IsAbstract)
        .SelectMany(controller =>
        {
            var prefix = "/api/" + controller.Name.Replace("Controller", string.Empty).ToLowerInvariant();
            return controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .SelectMany(m => m.GetCustomAttributes<HttpMethodAttribute>())
                .SelectMany(http => http.HttpMethods.Select(verb =>
                    $"{verb} {prefix}{(string.IsNullOrEmpty(http.Template) ? string.Empty : "/" + http.Template)}"));
        })
        .Select(StripConstraints)
        .ToList();

    public static List<Tool> Tools() => MCP.GetTypes()
        .Where(t => t.GetCustomAttribute<McpServerToolTypeAttribute>() != null)
        .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Static))
        .Select(m => (Method: m, Attribute: m.GetCustomAttribute<McpServerToolAttribute>()))
        .Where(x => x.Attribute != null)
        .Select(x => new Tool(x.Method, x.Attribute!, x.Attribute!.Name ?? x.Method.Name,
            x.Method.GetCustomAttribute<DescriptionAttribute>()?.Description ?? string.Empty,
            x.Method.GetCustomAttribute<ApiOperationAttribute>()))
        .ToList();

    public static string Key(ApiOperationAttribute operation) => $"{operation.Verb} {operation.Route}";

    private static string StripConstraints(string route) =>
        System.Text.RegularExpressions.Regex.Replace(route, @"\{(\w+):[^}]+\}", "{$1}");
}
