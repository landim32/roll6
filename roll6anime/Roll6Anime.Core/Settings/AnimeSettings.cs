namespace Roll6Anime.Core.Settings;

/// <summary>
/// The tool's configuration (062, contracts/configuration.md): section <c>Roll6Anime</c> of <c>appsettings.json</c>
/// next to the executable, or the <c>Roll6Anime__*</c> environment variables. Read once, when the window opens.
/// </summary>
public class AnimeSettings
{
    public const string SECTION = "Roll6Anime";

    /// <summary>The folder listed and watched; the tool never writes to it (FR-009).</summary>
    public string AnimationsFolder { get; set; } = @"C:\repos\gurps-adventure\animacoes";

    /// <summary>Where the local Claude Code runs: the table project, with the <c>criar-animacao</c> skill.</summary>
    public string ClaudeWorkingDirectory { get; set; } = @"C:\repos\gurps-adventure";

    /// <summary>The Claude Code CLI, by name (resolved through the PATH) or by path.</summary>
    public string ClaudeExecutable { get; set; } = "claude";

    /// <summary>Value of <c>--allowedTools</c>, on top of <c>--permission-mode acceptEdits</c> (runs the skill's validar.py).</summary>
    public string ClaudeAllowedTools { get; set; } = "Bash(python:*)";

    /// <summary>The message when the animations folder is missing, or null.</summary>
    public string? CheckAnimationsFolder() =>
        Directory.Exists(AnimationsFolder)
            ? null
            : $"A pasta de animações não existe: {AnimationsFolder}. Ajuste Roll6Anime:AnimationsFolder em appsettings.json.";

    /// <summary>The message when the Claude working directory is missing, or null.</summary>
    public string? CheckClaudeWorkingDirectory() =>
        Directory.Exists(ClaudeWorkingDirectory)
            ? null
            : $"A pasta de trabalho do Claude não existe: {ClaudeWorkingDirectory}.";

    /// <summary>Every problem with the configured folders (FR-016, US4).</summary>
    public IReadOnlyList<string> Check() =>
        new[] { CheckAnimationsFolder(), CheckClaudeWorkingDirectory() }.OfType<string>().ToList();
}
