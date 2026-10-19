using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.DTO.Chat;
using Roll6.DTO.Realtime;

namespace Roll6.Tests.Domain.Services;

/// <summary>093: "Perguntar" — questions to the master's Claude, their answers, privacy, the timeout and corrections.</summary>
public partial class TurnServiceChatTests
{
    private void ConsoleOnline(bool online = true) => _askDispatcher.Setup(d => d.IsAgentConnected(MASTER)).Returns(online);

    private Turn WaitingQuestion(long id = 500, long userId = PLAYER, long? characterId = ARIA, bool whisper = false)
    {
        var question = Turn.Question(CAMPAIGN, MAP, 3, userId, characterId, characterId == null ? "Mestre (GM) — Ana" : "Aria", null, "Onde fica a torre?");
        question.TurnId = id;
        question.CreatedAt = DateTime.UtcNow.AddMinutes(-1);
        question.IsWhisper = whisper;
        _repository.Setup(r => r.GetByIdAsync(id)).ReturnsAsync(() => question);
        return question;
    }

    [Fact]
    public async Task Ask_WhenTheMastersConsoleIsOffline_IsConflict()
    {
        ConsoleOnline(false);

        var act = () => _service.AskAsync(PLAYER, CAMPAIGN, new ChatAskInfo { CharacterId = ARIA, Text = "Oi?" });

        await act.Should().ThrowAsync<ConflictException>().WithMessage("O console do mestre não está conectado.");
        _askDispatcher.Verify(d => d.EnqueueAsync(It.IsAny<AskJob>()), Times.Never);
    }

    [Fact]
    public async Task Ask_WhileTheCallerWaits_IsConflict()
    {
        ConsoleOnline();
        _repository.Setup(r => r.GetWaitingAskAsync(CAMPAIGN, PLAYER)).ReturnsAsync(WaitingQuestion());

        var act = () => _service.AskAsync(PLAYER, CAMPAIGN, new ChatAskInfo { CharacterId = ARIA, Text = "De novo?" });

        await act.Should().ThrowAsync<ConflictException>().WithMessage("Aguarde a resposta da sua pergunta.");
    }

    [Fact]
    public async Task Ask_SavesAWaitingQuestion_PublishesAndQueuesItForTheMastersConsole()
    {
        ConsoleOnline();

        var item = await _service.AskAsync(PLAYER, CAMPAIGN, new ChatAskInfo { CharacterId = ARIA, Text = "  Onde fica a torre?  " });

        item.Kind.Should().Be("question");
        item.Ask!.State.Should().Be(ChatAskStateInfo.WAITING);
        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == TurnType.Question && t.AskState == AskState.Waiting && !t.IsWhisper)));
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_MESSAGE)), Times.Once);
        _askDispatcher.Verify(d => d.EnqueueAsync(It.Is<AskJob>(j =>
            j.TurnId == 900 && j.MasterUserId == MASTER && j.CampaignId == CAMPAIGN && j.SpeakerName == "Aria" && j.Text == "Onde fica a torre?")));
    }

    [Fact]
    public async Task Ask_TooLong_IsRefusedBeforeAnything()
    {
        ConsoleOnline();

        var act = () => _service.AskAsync(PLAYER, CAMPAIGN, new ChatAskInfo { CharacterId = ARIA, Text = new string('x', Turn.MAX_QUESTION + 1) });

        await act.Should().ThrowAsync<DomainValidationException>();
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Ask_Private_IsAWhisperToTheMaster()
    {
        ConsoleOnline();

        await _service.AskAsync(PLAYER, CAMPAIGN, new ChatAskInfo { CharacterId = ARIA, Text = "Segredo?", Private = true });

        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.IsWhisper)));
        _whispers.Verify(w => w.InsertAsync(It.Is<IEnumerable<TurnWhisperTarget>>(targets =>
            targets.Count() == 1 && targets.Single().CharacterId == null)));
    }

    [Fact]
    public async Task Ask_PrivateByTheMaster_IsAWhisperOnlyHeSees()
    {
        ConsoleOnline();

        await _service.AskAsync(MASTER, CAMPAIGN, new ChatAskInfo { Text = "Só eu?", Private = true });

        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.IsWhisper && t.CharacterId == null)));
        _whispers.Verify(w => w.InsertAsync(It.Is<IEnumerable<TurnWhisperTarget>>(targets => !targets.Any())));
    }

    [Fact]
    public async Task Complete_SavesTheAnswerReplyingToTheQuestion_AndMarksItAnswered()
    {
        var question = WaitingQuestion();
        Turn? answer = null;
        _repository.Setup(r => r.InsertAsync(It.IsAny<Turn>())).ReturnsAsync((Turn t) => { t.TurnId = 501; answer = t; return t; });

        await _service.CompleteAsync(500, "Ao norte, depois do rio.");

        answer!.TurnType.Should().Be(TurnType.Answer);
        answer.ReplyToTurnId.Should().Be(500);
        answer.UserId.Should().Be(MASTER);
        answer.DisplayName.Should().Be(Turn.ANSWER_NAME);
        answer.IsWhisper.Should().BeFalse();
        question.AskState.Should().Be(AskState.Answered);
        _repository.Verify(r => r.UpdateAsync(question));
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_MESSAGE)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED)), Times.Once);
    }

    [Fact]
    public async Task Complete_APrivateQuestion_WhispersTheAnswerToItsSpeaker()
    {
        WaitingQuestion(whisper: true);

        await _service.CompleteAsync(500, "Resposta só para você.");

        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == TurnType.Answer && t.IsWhisper)));
        _whispers.Verify(w => w.InsertAsync(It.Is<IEnumerable<TurnWhisperTarget>>(targets =>
            targets.Count() == 1 && targets.Single().CharacterId == ARIA)));
    }

    [Fact]
    public async Task Complete_OnlyOnce_AndNeverForAFailedQuestion()
    {
        var question = WaitingQuestion();
        question.MarkFailed();

        await _service.CompleteAsync(500, "Tarde demais.");

        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Fail_MarksTheQuestionFailed_AndTellsTheTable()
    {
        var question = WaitingQuestion();

        await _service.FailAsync(500);
        await _service.FailAsync(500);

        question.AskState.Should().Be(AskState.Failed);
        _repository.Verify(r => r.UpdateAsync(question), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED)), Times.Once);
    }

    [Fact]
    public async Task FailExpired_FailsTheQuestionsOlderThanTwoMinutes()
    {
        var question = WaitingQuestion();
        var now = DateTime.UtcNow;
        _repository.Setup(r => r.ListWaitingAsksOlderThanAsync(It.Is<DateTime>(cutoff => cutoff == now - TimeSpan.FromMinutes(2))))
            .ReturnsAsync(new List<Turn> { question });

        var failed = await _service.FailExpiredAsync(now);

        failed.Should().Equal(500);
        question.AskState.Should().Be(AskState.Failed);
    }

    [Fact]
    public async Task EditAnswer_OnlyTheMaster_OnlyAnswers()
    {
        var question = WaitingQuestion();
        var answer = Turn.Answer(question, MASTER, "Errado.");
        answer.TurnId = 501;
        _repository.Setup(r => r.GetByIdAsync(501)).ReturnsAsync(answer);

        var player = () => _service.EditAnswerAsync(PLAYER, 501, new ChatAnswerEditInfo { Text = "Hack" });
        await player.Should().ThrowAsync<UnauthorizedAccessException>();
        var notAnswer = () => _service.EditAnswerAsync(MASTER, 500, new ChatAnswerEditInfo { Text = "x" });
        await notAnswer.Should().ThrowAsync<DomainValidationException>();

        var item = await _service.EditAnswerAsync(MASTER, 501, new ChatAnswerEditInfo { Text = "Certo." });

        answer.Description.Should().Be("Certo.");
        item.EditedAt.Should().NotBeNull();
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_UPDATED)), Times.Once);
    }

    [Fact]
    public async Task Status_SaysWhetherTheMastersConsoleIsOnline_AndTheCallersWaitingQuestion()
    {
        ConsoleOnline();
        _repository.Setup(r => r.GetWaitingAskAsync(CAMPAIGN, PLAYER)).ReturnsAsync(WaitingQuestion());

        var status = await _service.StatusAsync(PLAYER, CAMPAIGN);

        status.Available.Should().BeTrue();
        status.WaitingTurnId.Should().Be(500);
    }
}
