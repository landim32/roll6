namespace Roll6.Domain.Notifications;

/// <summary>
/// "Falta apenas você…" (043, N3): sent at the action that makes the characters who acted in the turn reach half of
/// the approved characters, rounded up.
/// </summary>
public static class Majority
{
    public static int Threshold(int approvedCharacters) => (approvedCharacters + 1) / 2;

    /// <summary>The action took the count from below the threshold to it (with someone still missing).</summary>
    public static bool Crossed(int approvedCharacters, int actedBefore, int actedAfter)
    {
        if (approvedCharacters <= 0)
            return false;
        var threshold = Threshold(approvedCharacters);
        return actedBefore < threshold && actedAfter >= threshold && actedAfter < approvedCharacters;
    }
}
