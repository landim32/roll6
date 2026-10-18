using Roll6.Domain.Enums;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Services;

/// <summary>The conversations of the animation editor (086): see <see cref="IAnimationConversationService"/>.</summary>
public class AnimationConversationService : IAnimationConversationService
{
    public const string NOT_OWNER = "Só o dono edita esta animação.";

    private readonly IAnimationRepository<Animation> _animations;
    private readonly IAnimationConversationRepository<AnimationConversation> _conversations;
    private readonly IAnimationMessageRepository<AnimationMessage> _messages;
    private readonly TimeProvider _time;

    public AnimationConversationService(
        IAnimationRepository<Animation> animations,
        IAnimationConversationRepository<AnimationConversation> conversations,
        IAnimationMessageRepository<AnimationMessage> messages,
        TimeProvider time)
    {
        _animations = animations;
        _conversations = conversations;
        _messages = messages;
        _time = time;
    }

    public async Task<AnimationConversation> GetOrOpenAsync(long userId, long animationId)
    {
        await EnsureOwnerAsync(userId, animationId);
        return await _conversations.GetOpenAsync(animationId)
            ?? await _conversations.InsertAsync(AnimationConversation.Open(animationId, userId));
    }

    public async Task<List<AnimationMessage>> ListMessagesAsync(long userId, long animationId)
    {
        await EnsureOwnerAsync(userId, animationId);
        var conversation = await _conversations.GetOpenAsync(animationId);
        return conversation == null
            ? new List<AnimationMessage>()
            : await _messages.ListByConversationAsync(conversation.AnimationConversationId);
    }

    public Task<AnimationMessage> AddMessageAsync(long conversationId, ConversationRole role, string? text, int imageCount = 0) =>
        _messages.InsertAsync(AnimationMessage.Create(conversationId, role, text, imageCount));

    public async Task MarkStartedAsync(long conversationId)
    {
        var conversation = await _conversations.GetByIdAsync(conversationId);
        if (conversation == null || conversation.Started)
            return;
        conversation.MarkStarted();
        await _conversations.UpdateAsync(conversation);
    }

    public async Task CloseAsync(long userId, long animationId)
    {
        await EnsureOwnerAsync(userId, animationId);
        var conversation = await _conversations.GetOpenAsync(animationId);
        if (conversation == null)
            return;
        conversation.Close(_time.GetUtcNow().UtcDateTime);
        await _conversations.UpdateAsync(conversation);
    }

    private async Task EnsureOwnerAsync(long userId, long animationId)
    {
        var animation = await _animations.GetByIdAsync(animationId) ?? throw new KeyNotFoundException(AnimationService.NOT_FOUND);
        if (!animation.IsOwnedBy(userId))
            throw new UnauthorizedAccessException(NOT_OWNER);
    }
}
