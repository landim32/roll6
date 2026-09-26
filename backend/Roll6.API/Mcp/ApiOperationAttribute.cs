namespace Roll6.API.Mcp;

/// <summary>
/// The REST operation an MCP tool mirrors (020). The coverage test matches these against the controllers, so
/// every API operation available to API keys has exactly one tool.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public sealed class ApiOperationAttribute : Attribute
{
    public ApiOperationAttribute(string verb, string route)
    {
        Verb = verb;
        Route = route;
    }

    /// <summary>HTTP verb in upper case (GET, POST, PUT, DELETE).</summary>
    public string Verb { get; }

    /// <summary>Route as in the controllers, without constraints (e.g. <c>/api/maptoken/{id}/position</c>).</summary>
    public string Route { get; }
}
