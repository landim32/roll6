using Roll6Anime.Core.Settings;

namespace Roll6Anime.Core.Claude;

/// <summary>
/// What goes with each request (062, FR-011, research R8): the context of the screen — the open animation (or the
/// order to create one), the model — as a system prompt appended to the Claude Code's, so the user can say "feche a mão
/// esquerda" without naming the file; and the CLI's argument list (contracts/claude-cli.md).
/// </summary>
public static class PromptContext
{
    /// <summary>The context text, in Portuguese.</summary>
    public static string Build(AnimeSettings settings, string? animationPath, string? modelPath)
    {
        var lines = new List<string>
        {
            "Você está atendendo um pedido feito no roll6anime, o editor de animações do Roll6.",
            "Use a skill criar-animacao (formato roll6-animation v1).",
        };
        if (animationPath != null)
            lines.Add($"Animação aberta: {Relative(settings.ClaudeWorkingDirectory, animationPath)} — altere este mesmo arquivo e valide com o validar.py da skill.");
        else
            lines.Add($"Nenhuma animação aberta — crie um arquivo novo em {Relative(settings.ClaudeWorkingDirectory, settings.AnimationsFolder)}/ e valide com o validar.py da skill.");
        if (modelPath != null)
            lines.Add($"Modelo aberto na tela: {modelPath} (só para referência; não o altere).");
        lines.Add("Grave e altere arquivos com as ferramentas Write/Edit. No Bash, rode só comandos python simples, como o validar.py (sem heredoc, \"&&\", \";\" ou \"|\"): o resto não tem permissão.");
        lines.Add("Não envie a animação ao Roll6 a menos que o usuário peça.");
        return string.Join(Environment.NewLine, lines);
    }

    /// <summary>
    /// The arguments for <c>ProcessStartInfo.ArgumentList</c>: the first request of a conversation creates the session
    /// with its id, the next ones resume it.
    /// </summary>
    public static List<string> ClaudeArguments(AnimeSettings settings, Conversation conversation, string context) => new()
    {
        "-p",
        "--output-format", "stream-json",
        "--verbose",
        "--include-partial-messages",
        conversation.Started ? "--resume" : "--session-id", conversation.SessionId.ToString(),
        "--permission-mode", "acceptEdits",
        "--allowedTools", settings.ClaudeAllowedTools,
        "--append-system-prompt", context,
    };

    /// <summary>A path inside the working directory as the Claude sees it ("animacoes/x.json"); else the full path.</summary>
    public static string Relative(string workingDirectory, string path)
    {
        var relative = Path.GetRelativePath(Path.GetFullPath(workingDirectory), Path.GetFullPath(path));
        return relative.StartsWith("..", StringComparison.Ordinal) || Path.IsPathRooted(relative)
            ? path
            : relative.Replace('\\', '/');
    }
}
