using Roll6.Domain.Enums;

namespace Roll6.Domain.Models;

/// <summary>
/// The conversation of one animation with the local Claude (086): one open conversation per animation, carrying the
/// Claude session id — created with <c>--session-id</c> on the first request, resumed afterwards (<see cref="Started"/>)
/// — so a request made days later goes on from where it stopped. "Nova conversa" closes it; the next request opens a new
/// one with a new session.
/// </summary>
public class AnimationConversation
{
    public long AnimationConversationId { get; set; }
    public long AnimationId { get; set; }
    public long UserId { get; set; }
    public Guid ClaudeSessionId { get; set; }
    /// <summary>The Claude already knows the session: the next request resumes it instead of creating it.</summary>
    public bool Started { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }

    public bool IsOpen => ClosedAt == null;

    public static AnimationConversation Open(long animationId, long userId) => new()
    {
        AnimationId = animationId,
        UserId = userId,
        ClaudeSessionId = Guid.NewGuid(),
        CreatedAt = DateTime.UtcNow,
    };

    /// <summary>The first request reached the Claude: from now on the session is resumed.</summary>
    public void MarkStarted() => Started = true;

    public void Close(DateTime now) => ClosedAt ??= now;
}

/// <summary>One line of an animation editor conversation (086): what the user asked, what the Claude answered, a notice.</summary>
public class AnimationMessage
{
    public const int MAX_TEXT = 20000;

    public long AnimationMessageId { get; set; }
    public long AnimationConversationId { get; set; }
    public ConversationRole Role { get; set; }
    public string Text { get; set; } = string.Empty;
    /// <summary>How many prints went with a user line; the pictures are not stored.</summary>
    public int ImageCount { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>A line with its text cut at <see cref="MAX_TEXT"/> (an ellipsis marks the cut).</summary>
    public static AnimationMessage Create(long conversationId, ConversationRole role, string? text, int imageCount = 0) => new()
    {
        AnimationConversationId = conversationId,
        Role = role,
        Text = Cut(text ?? string.Empty),
        ImageCount = Math.Max(0, imageCount),
        CreatedAt = DateTime.UtcNow,
    };

    public static string Cut(string text) => text.Length <= MAX_TEXT ? text : text[..(MAX_TEXT - 1)] + "…";
}
