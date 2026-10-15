namespace Roll6.Domain.Notifications;

/// <summary>
/// "Falta apenas Fulano e você" (074, N3): once at least half of the approved characters acted in the turn, each player
/// who still has a character without a valid action is told who else is missing. Counted per character, named per
/// person (first names, sorted), a person with two missing characters once. Pure, pinned by the US3 table.
/// </summary>
public static class Pending
{
    /// <summary>
    /// The body of each player to remind, by user id; empty below the majority or when nobody is missing.
    /// </summary>
    public static IReadOnlyDictionary<long, string> Reminders(
        IReadOnlyCollection<long> approvedCharacterIds,
        IReadOnlyCollection<long> actedCharacterIds,
        IReadOnlyDictionary<long, long> ownerOfCharacter,
        IReadOnlyDictionary<long, string> firstNameOfUser)
    {
        var approved = approvedCharacterIds.Distinct().ToList();
        var acted = actedCharacterIds.Where(approved.Contains).Distinct().Count();
        if (approved.Count == 0 || acted < Majority.Threshold(approved.Count))
            return new Dictionary<long, string>();
        var missingOwners = approved
            .Where(c => !actedCharacterIds.Contains(c) && ownerOfCharacter.ContainsKey(c))
            .Select(c => ownerOfCharacter[c])
            .Distinct()
            .ToList();
        string NameOf(long userId) => firstNameOfUser.TryGetValue(userId, out var name) && !string.IsNullOrWhiteSpace(name) ? name : "Alguém";
        return missingOwners.ToDictionary(
            user => user,
            user => NoticeTexts.Pending(missingOwners
                .Where(other => other != user)
                .Select(NameOf)
                .OrderBy(n => n, StringComparer.CurrentCulture)
                .ToList()));
    }
}
