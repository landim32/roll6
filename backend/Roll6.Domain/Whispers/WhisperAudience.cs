namespace Roll6.Domain.Whispers;

/// <summary>
/// Who sees a whisper (047), pure: the author, the campaign master and the current owners of the target characters.
/// Anyone else never gets a whispered message and gets a whispered action with its text replaced.
/// </summary>
public static class WhisperAudience
{
    /// <summary>What a whispered action shows to whoever is not in it.</summary>
    public const string MASKED_TEXT = "está sussurrando!";

    public static bool CanSee(bool isWhisper, long authorId, IEnumerable<long> targetOwnerIds, long viewerId, bool viewerIsMaster) =>
        !isWhisper || viewerIsMaster || authorId == viewerId || targetOwnerIds.Contains(viewerId);

    /// <summary>The users who see the whole whisper: author, master and the owners of the targets.</summary>
    public static HashSet<long> Audience(long authorId, long masterId, IEnumerable<long> targetOwnerIds)
    {
        var users = new HashSet<long>(targetOwnerIds) { authorId, masterId };
        return users;
    }

    /// <summary>
    /// Who is notified of a whispered message: the owners of the targets and the master only when targeted, never the
    /// author (the dispatcher removes the actor anyway).
    /// </summary>
    public static List<long> NoticeTargets(long authorId, long masterId, bool masterTargeted, IEnumerable<long> targetOwnerIds)
    {
        var users = new HashSet<long>(targetOwnerIds);
        if (masterTargeted) users.Add(masterId);
        users.Remove(authorId);
        return users.ToList();
    }
}
