namespace Roll6.Domain.Enums;

/// <summary>Who wrote a line of an animation editor conversation (086).</summary>
public enum ConversationRole
{
    User = 1,
    Claude = 2,
    /// <summary>What the server or the console says: a failure, a stop, an invalid file.</summary>
    Notice = 3,
}
