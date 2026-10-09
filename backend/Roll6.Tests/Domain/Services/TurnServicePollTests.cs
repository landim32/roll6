using FluentAssertions;
using Moq;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Tests.Domain.Services;

/// <summary>045: Gargalhada and polls in the chat (same fixture as the 041/044 chat tests).</summary>
public partial class TurnServiceChatTests
{
    private const long POLL = 700;

    private Turn PollEntry(bool deleted = false)
    {
        var poll = Turn.Poll(CAMPAIGN, MAP, 3, MASTER, null, "Mestre (GM) — Ana", null, "Para onde vamos?");
        poll.TurnId = POLL;
        if (deleted)
            poll.Delete(MASTER, true);
        _repository.Setup(r => r.GetByIdAsync(POLL)).ReturnsAsync(poll);
        _chatPolls.Setup(r => r.ListOptionsByTurnsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<ChatPollOption>
        {
            new() { ChatPollOptionId = 1, TurnId = POLL, Position = 0, Text = "Floresta" },
            new() { ChatPollOptionId = 2, TurnId = POLL, Position = 1, Text = "Caverna" }
        });
        _chatPolls.Setup(r => r.GetOptionAsync(1)).ReturnsAsync(new ChatPollOption { ChatPollOptionId = 1, TurnId = POLL, Text = "Floresta" });
        _chatPolls.Setup(r => r.GetOptionAsync(99)).ReturnsAsync(new ChatPollOption { ChatPollOptionId = 99, TurnId = 1234, Text = "Outra" });
        return poll;
    }

    // --- Gargalhada (US1) ---

    [Fact]
    public void Laugh_ParsesAndNames()
    {
        ChatReaction.Parse(" LAUGH ").Should().Be(ChatReactionKind.Laugh);
        ChatReaction.Name(ChatReactionKind.Laugh).Should().Be("laugh");
        FluentActions.Invoking(() => ChatReaction.Parse("haha")).Should().Throw<DomainValidationException>();
    }

    [Fact]
    public async Task React_Laugh_SwitchesFromLikeAndRemovesOnRepeat()
    {
        var target = Turn.Text(CAMPAIGN, MAP, 3, MASTER, null, "Mestre (GM) — Ana", null, "Oi");
        target.TurnId = 63;
        _repository.Setup(r => r.GetByIdAsync(63)).ReturnsAsync(target);
        var existing = ChatReaction.Create(63, PLAYER, ChatReactionKind.Like);
        existing.ChatReactionId = 11;
        _chatReactions.Setup(r => r.GetAsync(63, PLAYER)).ReturnsAsync(existing);

        await _service.ReactAsync(PLAYER, 63, new ChatReactInfo { Kind = "laugh" });
        _chatReactions.Verify(r => r.UpdateAsync(It.Is<ChatReaction>(x => x.Kind == ChatReactionKind.Laugh)), Times.Once);

        await _service.ReactAsync(PLAYER, 63, new ChatReactInfo { Kind = "laugh" });
        _chatReactions.Verify(r => r.DeleteAsync(11), Times.Once);
    }

    // --- Creating a poll (US2) ---

    [Fact]
    public async Task CreatePoll_AsCharacter_SavesOptionsPublishesAndNotifies()
    {
        List<ChatPollOption>? saved = null;
        _chatPolls.Setup(r => r.InsertOptionsAsync(It.IsAny<IEnumerable<ChatPollOption>>()))
            .Callback((IEnumerable<ChatPollOption> o) => saved = o.ToList()).Returns(Task.CompletedTask);

        var item = await _service.CreatePollAsync(PLAYER, CAMPAIGN, new ChatPollCreateInfo
        {
            CharacterId = ARIA, Question = "  Para onde vamos? ", Options = new List<string> { " Floresta ", "", "Caverna", "Vila" }
        });

        (item.Kind, item.DisplayName, item.Text, item.TurnNo, item.CanReply, item.CanConvert)
            .Should().Be(("poll", "Aria", "Para onde vamos?", 3, true, (string?)null));
        saved!.Select(o => (o.TurnId, o.Position, o.Text)).Should().Equal((900L, 0, "Floresta"), (900L, 1, "Caverna"), (900L, 2, "Vila"));
        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == Roll6.Domain.Enums.TurnType.Poll && t.CharacterId == ARIA)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_MESSAGE)), Times.Once);
        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Message && n.Body == "Enquete: Para onde vamos?")), Times.Once);
    }

    [Theory]
    [InlineData("", new[] { "A", "B" }, "question")]
    [InlineData("Pergunta?", new[] { "Só uma" }, "options")]
    [InlineData("Pergunta?", new[] { "Vila", "  vila  " }, "options")]
    [InlineData("Pergunta?", new[] { "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13" }, "options")]
    public async Task CreatePoll_Invalid_Is400(string question, string[] options, string field)
    {
        var act = () => _service.CreatePollAsync(MASTER, CAMPAIGN, new ChatPollCreateInfo { Question = question, Options = options.ToList() });

        (await act.Should().ThrowAsync<DomainValidationException>()).Which.Errors.Keys.Should().Contain(field);
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task CreatePoll_OptionTooLong_Is400_AndOthersCharacterIs403()
    {
        await _service.Invoking(s => s.CreatePollAsync(MASTER, CAMPAIGN, new ChatPollCreateInfo
            { Question = "?", Options = new List<string> { new('x', 101), "B" } })).Should().ThrowAsync<DomainValidationException>();
        await _service.Invoking(s => s.CreatePollAsync(MASTER, CAMPAIGN, new ChatPollCreateInfo
            { CharacterId = ARIA, Question = "?", Options = new List<string> { "A", "B" } })).Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Poll_ItemCarriesOptionsVotesAndVoters()
    {
        PollEntry();
        _chatPolls.Setup(r => r.ListVotesByTurnsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<ChatPollVote>
        {
            new() { TurnId = POLL, ChatPollOptionId = 1, UserId = PLAYER, CharacterId = ARIA },
            new() { TurnId = POLL, ChatPollOptionId = 1, UserId = MASTER, CharacterId = null }
        });
        _chatPolls.Setup(r => r.SetVoteAsync(It.IsAny<long>(), It.IsAny<long?>(), It.IsAny<ChatPollVote?>())).Returns(Task.CompletedTask);

        var item = await _service.VoteAsync(MASTER, POLL, new ChatPollVoteInfo { OptionId = 1 });

        item.Poll!.Question.Should().Be("Para onde vamos?");
        item.Poll.TotalVotes.Should().Be(2);
        item.Poll.Options.Select(o => (o.OptionId, o.Text, o.Votes)).Should().Equal((1L, "Floresta", 2), (2L, "Caverna", 0));
        item.Poll.Options[0].Voters.Select(v => (v.CharacterId, v.Name)).Should().Equal(((long?)ARIA, "Aria"), ((long?)null, "Mestre"));
    }

    // --- Voting (US3) ---

    [Fact]
    public async Task Vote_AsOwnCharacter_SetsMovesAndWithdraws()
    {
        PollEntry();

        await _service.VoteAsync(PLAYER, POLL, new ChatPollVoteInfo { CharacterId = ARIA, OptionId = 1 });
        _chatPolls.Verify(r => r.SetVoteAsync(POLL, ARIA, It.Is<ChatPollVote>(v =>
            v.ChatPollOptionId == 1 && v.UserId == PLAYER && v.CharacterId == ARIA)), Times.Once);

        await _service.VoteAsync(PLAYER, POLL, new ChatPollVoteInfo { CharacterId = ARIA, OptionId = null });
        _chatPolls.Verify(r => r.SetVoteAsync(POLL, ARIA, null), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED)), Times.Exactly(2));
        _queue.Verify(q => q.Enqueue(It.IsAny<TableNotice>()), Times.Never);
    }

    [Fact]
    public async Task Vote_MasterWithoutCharacter_IsTheMastersVote()
    {
        PollEntry();
        await _service.VoteAsync(MASTER, POLL, new ChatPollVoteInfo { OptionId = 1 });
        _chatPolls.Verify(r => r.SetVoteAsync(POLL, null, It.Is<ChatPollVote>(v => v.CharacterId == null && v.UserId == MASTER)), Times.Once);
    }

    [Fact]
    public async Task Vote_Refusals()
    {
        PollEntry();
        // A player without a character is not the master.
        await _service.Invoking(s => s.VoteAsync(PLAYER, POLL, new ChatPollVoteInfo { OptionId = 1 })).Should().ThrowAsync<UnauthorizedAccessException>();
        // Bram is not approved; Aria is not the master's.
        await _service.Invoking(s => s.VoteAsync(PLAYER, POLL, new ChatPollVoteInfo { CharacterId = BRAM, OptionId = 1 })).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.VoteAsync(MASTER, POLL, new ChatPollVoteInfo { CharacterId = ARIA, OptionId = 1 })).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.VoteAsync(STRANGER, POLL, new ChatPollVoteInfo { OptionId = 1 })).Should().ThrowAsync<UnauthorizedAccessException>();
        // An option of another poll.
        await _service.Invoking(s => s.VoteAsync(MASTER, POLL, new ChatPollVoteInfo { OptionId = 99 })).Should().ThrowAsync<DomainValidationException>();
        _chatPolls.Verify(r => r.SetVoteAsync(It.IsAny<long>(), It.IsAny<long?>(), It.IsAny<ChatPollVote?>()), Times.Never);
    }

    [Fact]
    public async Task Vote_OnDeletedPollOrNotAPoll_Is400()
    {
        PollEntry(deleted: true);
        await _service.Invoking(s => s.VoteAsync(MASTER, POLL, new ChatPollVoteInfo { OptionId = 1 })).Should().ThrowAsync<DomainValidationException>();

        var text = Turn.Text(CAMPAIGN, MAP, 3, MASTER, null, "Mestre (GM) — Ana", null, "Oi");
        text.TurnId = 64;
        _repository.Setup(r => r.GetByIdAsync(64)).ReturnsAsync(text);
        await _service.Invoking(s => s.VoteAsync(MASTER, 64, new ChatPollVoteInfo { OptionId = 1 })).Should().ThrowAsync<DomainValidationException>();
    }

    // --- The poll as a message (US4) ---

    [Fact]
    public async Task Poll_DeletedByAuthor_RendersDeleted_AndReplyQuotesIt()
    {
        var poll = PollEntry();
        poll.CanBeDeletedBy(MASTER, true).Should().BeTrue();
        poll.CanBeDeletedBy(PLAYER, false).Should().BeFalse();

        _repository.Setup(r => r.ListByIdsAsync(It.IsAny<IEnumerable<long>>())).ReturnsAsync(new List<Turn> { poll });
        var reply = await _service.SendAsync(PLAYER, CAMPAIGN, new ChatSendInfo { CharacterId = ARIA, Text = "Floresta!", ReplyToTurnId = POLL });
        reply.ReplyTo!.Excerpt.Should().Be("Enquete: Para onde vamos?");

        await _service.DeleteMessageAsync(MASTER, POLL);
        _repository.Verify(r => r.UpdateAsync(It.Is<Turn>(t => t.TurnId == POLL && t.DeletedAt != null)), Times.Once);
    }
}
