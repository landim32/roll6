namespace Roll6.Console.Settings;

/// <summary>
/// The configuration of the console (086, contracts/agent-config.md): section <c>Roll6Console</c> of
/// <c>appsettings.json</c> next to the executable, or the <c>Roll6Console__*</c> environment variables; the API key only
/// from <c>ROLL6_API_KEY</c> (never written anywhere) and the site optionally from <c>ROLL6_URL</c>. Nothing here is about
/// animations: the server says which files to write and watch, always inside the working directory.
/// </summary>
public class ConsoleSettings
{
    public const string SECTION = "Roll6Console";
    public const string API_KEY_VARIABLE = "ROLL6_API_KEY";
    public const string URL_VARIABLE = "ROLL6_URL";

    public const string MISSING_KEY = "Defina a variável ROLL6_API_KEY com uma chave de API do Roll6 (menu do usuário › Chaves de API).";
    public const string INVALID_KEY = "Chave de API inválida ou revogada.";

    /// <summary>The Roll6 site (its REST API at /api, the hub at /hubs/animation).</summary>
    public string Url { get; set; } = "https://roll6.site";

    /// <summary>Where the local Claude Code runs and the only place the console writes and watches.</summary>
    public string ClaudeWorkingDirectory { get; set; } = @"C:\repos\gurps-adventure";

    /// <summary>The Claude Code CLI, by name (resolved through the PATH) or by path.</summary>
    public string ClaudeExecutable { get; set; } = "claude";

    /// <summary>095: the Codex CLI (the map generator's engine), by name (PATH, .exe/.cmd) or by path. Runs in the same folder.</summary>
    public string CodexExecutable { get; set; } = "codex";

    /// <summary>Value of <c>--allowedTools</c>, on top of <c>--permission-mode acceptEdits</c>.</summary>
    public string ClaudeAllowedTools { get; set; } = "Bash(python:*)";

    /// <summary>The API key, read from the environment only.</summary>
    public string? ApiKey { get; set; }

    /// <summary>The environment overrides: the key, and the site when <c>ROLL6_URL</c> is set.</summary>
    public ConsoleSettings WithEnvironment(Func<string, string?> variable)
    {
        ApiKey = Trim(variable(API_KEY_VARIABLE));
        if (Trim(variable(URL_VARIABLE)) is { } url)
            Url = url;
        return this;
    }

    /// <summary>The site without a trailing slash.</summary>
    public string BaseUrl => Url.TrimEnd('/');

    public string HubUrl => BaseUrl + "/hubs/animation";

    /// <summary>The message when the working directory is missing, or null.</summary>
    public string? CheckClaudeWorkingDirectory() =>
        Directory.Exists(ClaudeWorkingDirectory)
            ? null
            : $"A pasta de trabalho do Claude não existe: {ClaudeWorkingDirectory}. Ajuste Roll6Console:ClaudeWorkingDirectory em appsettings.json.";

    private static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
