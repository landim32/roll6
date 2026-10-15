using System.Text.Json;

namespace Roll6Anime.Core.Upload;

/// <summary>
/// Where the roll6anime sends animations and with which key (067): the same access the table project's skills use —
/// <c>ROLL6_URL</c> + <c>ROLL6_API_KEY</c> in the environment, else the MCP server "roll6" of <c>~/.claude.json</c>
/// (the entry of the Claude's working directory first). The address there is the MCP endpoint (<c>…/mcp</c>); the REST
/// API lives on the same site, so the tool talks to <c>{site}/api</c> with the same headers. The tool never stores the key.
/// </summary>
public sealed record Roll6Connection(string ApiBase, IReadOnlyDictionary<string, string> Headers)
{
    public const string MISSING = "Sem acesso ao Roll6: configure o servidor MCP \"roll6\" no Claude Code do projeto da mesa "
        + "(claude mcp add --transport http roll6 https://roll6.site/mcp --header \"X-Api-Key: r6_…\") "
        + "ou as variáveis ROLL6_URL e ROLL6_API_KEY.";

    /// <summary>The connection from the environment or <c>~/.claude.json</c>, or null when neither has one.</summary>
    public static Roll6Connection? Resolve(string? workingDirectory, Func<string, string?>? environment = null, string? claudeJsonPath = null)
    {
        environment ??= Environment.GetEnvironmentVariable;
        var url = environment("ROLL6_URL");
        var key = environment("ROLL6_API_KEY");
        if (!string.IsNullOrWhiteSpace(url) && !string.IsNullOrWhiteSpace(key))
            return new Roll6Connection(ApiBaseOf(url), new Dictionary<string, string> { ["X-Api-Key"] = key.Trim() });

        var path = claudeJsonPath ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".claude.json");
        try
        {
            return File.Exists(path) ? FromClaudeJson(File.ReadAllText(path), workingDirectory) : null;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return null;
        }
    }

    /// <summary>The "roll6" MCP server of a <c>~/.claude.json</c>: the working directory's project, else any with a url.</summary>
    public static Roll6Connection? FromClaudeJson(string json, string? workingDirectory)
    {
        JsonDocument document;
        try
        {
            document = JsonDocument.Parse(json);
        }
        catch (JsonException)
        {
            return null;
        }
        using (document)
        {
            var root = document.RootElement;
            var server = ProjectServer(root, workingDirectory) ?? FindServer(root);
            if (server is not { } found || !found.TryGetProperty("url", out var url) || url.ValueKind != JsonValueKind.String)
                return null;
            var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (found.TryGetProperty("headers", out var given) && given.ValueKind == JsonValueKind.Object)
                foreach (var header in given.EnumerateObject())
                    if (header.Value.ValueKind == JsonValueKind.String)
                        headers[header.Name] = header.Value.GetString()!;
            return headers.Count == 0 ? null : new Roll6Connection(ApiBaseOf(url.GetString()!), headers);
        }
    }

    /// <summary>The site of an MCP address: "https://roll6.site/mcp" → "https://roll6.site".</summary>
    public static string ApiBaseOf(string url)
    {
        var trimmed = url.Trim().TrimEnd('/');
        return trimmed.EndsWith("/mcp", StringComparison.OrdinalIgnoreCase) ? trimmed[..^4] : trimmed;
    }

    private static JsonElement? ProjectServer(JsonElement root, string? workingDirectory)
    {
        if (string.IsNullOrWhiteSpace(workingDirectory) || !root.TryGetProperty("projects", out var projects)
            || projects.ValueKind != JsonValueKind.Object)
            return null;
        var wanted = Normalize(workingDirectory);
        foreach (var project in projects.EnumerateObject())
            if (Normalize(project.Name) == wanted && project.Value.ValueKind == JsonValueKind.Object
                && project.Value.TryGetProperty("mcpServers", out var servers) && servers.ValueKind == JsonValueKind.Object
                && servers.TryGetProperty("roll6", out var server) && server.ValueKind == JsonValueKind.Object)
                return server.Clone();
        return null;
    }

    /// <summary>The first "roll6" object with a url anywhere in the file (the skills' rule).</summary>
    private static JsonElement? FindServer(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            if (element.TryGetProperty("roll6", out var server) && server.ValueKind == JsonValueKind.Object
                && server.TryGetProperty("url", out _))
                return server.Clone();
            foreach (var property in element.EnumerateObject())
                if (FindServer(property.Value) is { } found)
                    return found;
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
                if (FindServer(item) is { } found)
                    return found;
        }
        return null;
    }

    private static string Normalize(string path) => path.Replace('\\', '/').TrimEnd('/').ToLowerInvariant();
}
