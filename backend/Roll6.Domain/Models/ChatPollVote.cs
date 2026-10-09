namespace Roll6.Domain.Models;

/// <summary>
/// The vote of one character (or of the master, with no character) on one chat poll (045): at most one per voter and
/// poll, moved from option to option or withdrawn.
/// </summary>
public class ChatPollVote
{
    public long ChatPollVoteId { get; set; }
    public long TurnId { get; set; }
    public long ChatPollOptionId { get; set; }
    /// <summary>Who tapped.</summary>
    public long UserId { get; set; }
    /// <summary>The character that voted; null = the master's vote.</summary>
    public long? CharacterId { get; set; }
    public DateTime CreatedAt { get; set; }

    public static ChatPollVote Create(long turnId, long optionId, long userId, long? characterId) => new()
    {
        TurnId = turnId,
        ChatPollOptionId = optionId,
        UserId = userId,
        CharacterId = characterId,
        CreatedAt = DateTime.UtcNow
    };
}
