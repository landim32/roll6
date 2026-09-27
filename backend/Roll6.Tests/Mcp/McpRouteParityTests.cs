using System.Reflection;
using System.Text.RegularExpressions;
using FluentAssertions;
using ModelContextProtocol.Protocol;
using Roll6.Mcp;

namespace Roll6.Tests.Mcp;

/// <summary>
/// Every tool sends exactly the REST request its [ApiOperation] names (020): same verb, same route, with the ids
/// the assistant passed — so the MCP container behaves as the API by construction.
/// </summary>
public class McpRouteParityTests
{
    public static IEnumerable<object[]> OperationTools() =>
        McpToolCatalog.Tools().Where(t => t.Operation != null).Select(t => new object[] { t.Name });

    [Theory]
    [MemberData(nameof(OperationTools))]
    public async Task Tool_SendsItsApiOperation(string name)
    {
        var tool = McpToolCatalog.Tools().Single(t => t.Name == name);
        var api = new FakeApi();

        var result = await Invoke(tool.Method, api.Client());

        (result.IsError ?? false).Should().BeFalse($"{name} should succeed against the fake API");
        api.Method!.Method.Should().Be(tool.Operation!.Verb);
        var path = api.PathAndQuery!.Split('?')[0];
        path.Should().MatchRegex(RoutePattern(tool.Operation.Route), $"{name} must call {tool.Operation.Route}");
        api.ApiKeyHeader.Should().Be(FakeApi.API_KEY, $"{name} must forward the caller's API key");
    }

    /// <summary>"/api/map/{id}/token" → ^/api/map/\d+/token$ (sample ids are numbers).</summary>
    private static string RoutePattern(string route) =>
        "^" + Regex.Replace(Regex.Escape(route), @"\\\{\w+}", @"\d+") + "$";

    /// <summary>Calls a tool with sample values: numbers 11, 12…, texts "sample", base64 for content, defaults for optionals.</summary>
    private static async Task<CallToolResult> Invoke(MethodInfo method, Roll6ApiClient api)
    {
        var next = 11;
        var args = method.GetParameters().Select(p =>
        {
            if (p.ParameterType == typeof(Roll6ApiClient)) return api;
            if (p.HasDefaultValue) return p.DefaultValue;
            var type = Nullable.GetUnderlyingType(p.ParameterType) ?? p.ParameterType;
            if (type == typeof(long)) return (object)(long)next++;
            if (type == typeof(int)) return next++;
            if (type == typeof(bool)) return true;
            if (type == typeof(string)) return p.Name == "contentBase64" ? Convert.ToBase64String(new byte[] { 1, 2, 3 }) : p.Name == "fileName" ? "sample.png" : "sample";
            throw new InvalidOperationException($"No sample for {p.ParameterType} {p.Name}");
        }).ToArray();
        return await (Task<CallToolResult>)method.Invoke(null, args)!;
    }
}
