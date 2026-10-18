using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Services;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Tests.Animations;

/// <summary>The conversation of an animation with the local Claude: the model and the service (086).</summary>
public class AnimationConversationTests
{
    private static readonly DateTime NOW = new(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);

    private readonly Mock<IAnimationRepository<Animation>> _animations = new();
    private readonly Mock<IAnimationConversationRepository<AnimationConversation>> _conversations = new();
    private readonly Mock<IAnimationMessageRepository<AnimationMessage>> _messages = new();
    private readonly AnimationConversationService _service;

    public AnimationConversationTests()
    {
        _animations.Setup(r => r.GetByIdAsync(7)).ReturnsAsync(new Animation { AnimationId = 7, UserId = 1, Name = "Aceno" });
        _conversations.Setup(r => r.InsertAsync(It.IsAny<AnimationConversation>()))
            .ReturnsAsync((AnimationConversation c) => { c.AnimationConversationId = 100; return c; });
        _conversations.Setup(r => r.UpdateAsync(It.IsAny<AnimationConversation>())).ReturnsAsync((AnimationConversation c) => c);
        _messages.Setup(r => r.InsertAsync(It.IsAny<AnimationMessage>())).ReturnsAsync((AnimationMessage m) => { m.AnimationMessageId = 5; return m; });
        _service = new AnimationConversationService(_animations.Object, _conversations.Object, _messages.Object, new TestClock(NOW));
    }

    [Fact]
    public void OpenStartsANewSessionAndCloseEndsIt()
    {
        var conversation = AnimationConversation.Open(7, 1);

        conversation.ClaudeSessionId.Should().NotBe(Guid.Empty);
        conversation.Started.Should().BeFalse();
        conversation.IsOpen.Should().BeTrue();

        conversation.MarkStarted();
        conversation.Close(NOW);
        conversation.Close(NOW.AddMinutes(1));

        conversation.Started.Should().BeTrue();
        conversation.IsOpen.Should().BeFalse();
        conversation.ClosedAt.Should().Be(NOW, "the first close wins");
    }

    [Fact]
    public void AMessageIsCutAtTheLimit()
    {
        var message = AnimationMessage.Create(100, ConversationRole.Claude, new string('a', AnimationMessage.MAX_TEXT + 10), -3);

        message.Text.Should().HaveLength(AnimationMessage.MAX_TEXT).And.EndWith("…");
        message.ImageCount.Should().Be(0);
        AnimationMessage.Create(100, ConversationRole.User, null, 2).Text.Should().BeEmpty();
    }

    [Fact]
    public async Task GetOrOpenOpensOnceAndResumesTheOpenOne()
    {
        _conversations.SetupSequence(r => r.GetOpenAsync(7))
            .ReturnsAsync((AnimationConversation?)null)
            .ReturnsAsync(new AnimationConversation { AnimationConversationId = 100, AnimationId = 7, UserId = 1, Started = true });

        var first = await _service.GetOrOpenAsync(1, 7);
        var second = await _service.GetOrOpenAsync(1, 7);

        first.AnimationConversationId.Should().Be(100);
        second.Started.Should().BeTrue();
        _conversations.Verify(r => r.InsertAsync(It.IsAny<AnimationConversation>()), Times.Once);
    }

    [Fact]
    public async Task OnlyTheOwnerReachesTheConversation()
    {
        var act = () => _service.GetOrOpenAsync(2, 7);
        await act.Should().ThrowAsync<UnauthorizedAccessException>();

        var missing = () => _service.ListMessagesAsync(1, 99);
        await missing.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task CloseMarksTheOpenConversationAndANewRequestOpensAnother()
    {
        var open = new AnimationConversation { AnimationConversationId = 100, AnimationId = 7, UserId = 1 };
        _conversations.SetupSequence(r => r.GetOpenAsync(7)).ReturnsAsync(open).ReturnsAsync((AnimationConversation?)null);

        await _service.CloseAsync(1, 7);
        var next = await _service.GetOrOpenAsync(1, 7);

        open.ClosedAt.Should().Be(NOW);
        next.ClaudeSessionId.Should().NotBe(open.ClaudeSessionId);
        _conversations.Verify(r => r.UpdateAsync(open), Times.Once);
    }

    [Fact]
    public async Task MarkStartedWritesOnce()
    {
        var conversation = new AnimationConversation { AnimationConversationId = 100 };
        _conversations.Setup(r => r.GetByIdAsync(100)).ReturnsAsync(conversation);

        await _service.MarkStartedAsync(100);
        conversation.Started = true;
        await _service.MarkStartedAsync(100);

        _conversations.Verify(r => r.UpdateAsync(It.IsAny<AnimationConversation>()), Times.Once);
    }

    [Fact]
    public async Task AddMessageStoresTheLine()
    {
        var message = await _service.AddMessageAsync(100, ConversationRole.User, "oi", 2);

        message.AnimationMessageId.Should().Be(5);
        message.Role.Should().Be(ConversationRole.User);
        message.ImageCount.Should().Be(2);
    }
}
