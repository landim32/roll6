using System.Text;

namespace Roll6.Domain.Gm;

/// <summary>
/// The pure rules of the GM mode (096): when a turn is complete — every approved character has a valid action — and the
/// lines the GM writes in the campaign chat about a run. The texts are Portuguese, one line each, and fit a chat
/// entry's description.
/// </summary>
public static class GmTurn
{
    /// <summary>What the Claude answers when the master's repository has no "gm" skill.</summary>
    public const string GM_NOT_CONFIGURED = "GM_NOT_CONFIGURED";

    /// <summary>The reason of a run stopped by the 10-minute timer.</summary>
    public const string TIMED_OUT = "demorou demais (mais de 10 minutos)";

    /// <summary>The name the GM lines show in the chat.</summary>
    public const string DISPLAY_NAME = "GM";

    /// <summary>How much of the Claude's answer a "terminou sem fechar" line quotes.</summary>
    public const int EXCERPT = 200;

    /// <summary>Longest line (a chat description).</summary>
    public const int MAX_LINE = 260;

    /// <summary>A turn is complete when there is at least one approved character and every one of them acted.</summary>
    public static bool Complete(IReadOnlyCollection<long> approvedCharacterIds, IReadOnlySet<long> actedCharacterIds) =>
        approvedCharacterIds.Count > 0 && approvedCharacterIds.All(actedCharacterIds.Contains);

    /// <summary>
    /// 099 (Q1 = B): the GM runs only for a complete turn in which somebody declared something — a turn made only of the
    /// actions repeated automatically at its start waits for a player or the master, so the fight never runs by itself.
    /// </summary>
    public static bool Complete(IReadOnlyCollection<long> approvedCharacterIds, IReadOnlySet<long> actedCharacterIds, bool anyDeclared) =>
        anyDeclared && Complete(approvedCharacterIds, actedCharacterIds);

    public static string Started(int turnNo) => $"O GM começou a processar o turno {turnNo}.";

    public static string Stopped() => "O GM foi interrompido.";

    public static string Failed(int turnNo, string reason) => Fit($"O GM falhou no turno {turnNo}: {Sentence(reason)}");

    public static string TimedOut(int turnNo) => Failed(turnNo, TIMED_OUT);

    public static string NotConfigured(int turnNo) => Failed(turnNo, "a skill gm não está configurada no repositório do mestre");

    /// <summary>The run ended and the turn is still open: what the Claude said, shortened.</summary>
    public static string NotClosed(int turnNo, string text)
    {
        var excerpt = Excerpt(text, EXCERPT);
        return Fit($"O GM terminou sem fechar o turno {turnNo}" + (excerpt.Length > 0 ? $": {excerpt}" : "."));
    }

    /// <summary>The failure reason of an outcome: its message, plus the tools the Claude was refused.</summary>
    public static string FailureReason(string? message, IReadOnlyList<string> permissionDenials)
    {
        var reason = string.IsNullOrWhiteSpace(message) ? "o pedido falhou" : message.Trim();
        if (permissionDenials.Count > 0)
            reason += $" (ferramentas negadas: {string.Join(", ", permissionDenials)})";
        return reason;
    }

    /// <summary>One line of at most <paramref name="max"/> characters, whitespace collapsed, cut with "…".</summary>
    public static string Excerpt(string? text, int max)
    {
        var line = new StringBuilder();
        var space = false;
        foreach (var c in text ?? string.Empty)
        {
            if (char.IsWhiteSpace(c) || char.IsControl(c))
            {
                space = line.Length > 0;
                continue;
            }
            if (space) line.Append(' ');
            space = false;
            line.Append(c);
        }
        var result = line.ToString();
        return result.Length <= max ? result : result[..(max - 1)].TrimEnd() + "…";
    }

    private static string Sentence(string reason)
    {
        var clean = Excerpt(reason, MAX_LINE);
        return clean.EndsWith('.') ? clean : clean + ".";
    }

    private static string Fit(string line) => line.Length <= MAX_LINE ? line : line[..(MAX_LINE - 1)].TrimEnd() + "…";
}

/// <summary>How a GM run ended, as the dispatcher reports it to the turn service (096).</summary>
public sealed record GmOutcome(
    /// <summary>"done", "stopped" or "failed" (the console's outcome kinds).</summary>
    string Kind,
    string? Message,
    IReadOnlyList<string> PermissionDenials,
    /// <summary>The server stopped it after the time limit.</summary>
    bool TimedOut,
    /// <summary>The master turned the mode off while it was queued or running.</summary>
    bool StoppedByMaster,
    /// <summary>Everything the Claude said.</summary>
    string Text);
