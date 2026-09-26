using System.ComponentModel;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using ModelContextProtocol.Server;
using Roll6.API.Controllers;
using Roll6.API.Mcp;

namespace Roll6.Tests.Mcp;

/// <summary>Reflection helpers shared by the MCP tests: the API operations and the MCP tools.</summary>
public static class McpToolCatalog
{
    public static readonly Assembly API = typeof(ApiControllerBase).Assembly;

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
        "DELETE /api/apikey/{id}"
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

    public static List<Tool> Tools() => API.GetTypes()
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
