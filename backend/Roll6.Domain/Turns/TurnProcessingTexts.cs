namespace Roll6.Domain.Turns;

/// <summary>101: the blue chat lines (GM notice style) of the master processing a turn.</summary>
public static class TurnProcessingTexts
{
    /// <summary>Longest reason of a stop.</summary>
    public const int MAX_REASON = 200;

    public const string REASON_TOO_LONG = "O motivo tem no máximo 200 caracteres.";

    /// <summary>The value of <c>ignored</c> when the GM mode is already processing the turn.</summary>
    public const string IGNORED_GM = "gm";

    public static string Started(int turnNo) => $"O mestre começou a processar o turno {turnNo}.";

    public static string Stopped(int turnNo, string? reason)
    {
        var text = reason?.Trim().TrimEnd('.').Trim();
        return string.IsNullOrEmpty(text)
            ? $"O mestre interrompeu o processamento do turno {turnNo}."
            : $"O mestre interrompeu o processamento do turno {turnNo}: {text}.";
    }
}
