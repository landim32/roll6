using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Models;

/// <summary>Curtir (joinha), Amei (coração) or Gargalhada (045) on a chat entry (044).</summary>
public enum ChatReactionKind
{
    Like = 1,
    Love = 2,
    Laugh = 3
}

/// <summary>One user's reaction to one chat entry (044): at most one per user and entry.</summary>
public class ChatReaction
{
    public long ChatReactionId { get; set; }
    public long TurnId { get; set; }
    public long UserId { get; set; }
    public ChatReactionKind Kind { get; set; }
    public DateTime CreatedAt { get; set; }

    public static ChatReaction Create(long turnId, long userId, ChatReactionKind kind) =>
        new() { TurnId = turnId, UserId = userId, Kind = kind, CreatedAt = DateTime.UtcNow };

    /// <summary>"like" | "love" | "laugh" → kind; anything else → 400.</summary>
    public static ChatReactionKind Parse(string? kind) => kind?.Trim().ToLowerInvariant() switch
    {
        "like" => ChatReactionKind.Like,
        "love" => ChatReactionKind.Love,
        "laugh" => ChatReactionKind.Laugh,
        _ => throw new DomainValidationException("kind", "A reação deve ser like, love ou laugh.")
    };

    public static string Name(ChatReactionKind kind) => kind switch
    {
        ChatReactionKind.Love => "love",
        ChatReactionKind.Laugh => "laugh",
        _ => "like"
    };
}
