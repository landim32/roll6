using Roll6.Domain.Enums;
using Roll6.Domain.Models;

namespace Roll6.Domain.Interfaces;

/// <summary>
/// The conversations of the animation editor with the local Claude (086): one open per animation, owner only. The hub
/// is the only caller; there is no REST endpoint (the page gets the state through <c>OpenEditor</c>).
/// </summary>
public interface IAnimationConversationService
{
    /// <summary>The open conversation of the animation, opened now when there is none (owner only, 403 otherwise).</summary>
    Task<AnimationConversation> GetOrOpenAsync(long userId, long animationId);
    /// <summary>The lines of the open conversation, oldest first (owner only).</summary>
    Task<List<AnimationMessage>> ListMessagesAsync(long userId, long animationId);
    Task<AnimationMessage> AddMessageAsync(long conversationId, ConversationRole role, string? text, int imageCount = 0);
    /// <summary>The first request reached the Claude: the session is resumed from now on.</summary>
    Task MarkStartedAsync(long conversationId);
    /// <summary>"Nova conversa": closes the open conversation (owner only); nothing when there is none.</summary>
    Task CloseAsync(long userId, long animationId);
}
