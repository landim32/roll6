using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Gm;
using Roll6.Domain.Interfaces;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.Domain.Services;
using Roll6.DTO.Realtime;
using Roll6.DTO.Realtime.Console;
using Roll6.DTO.Turn;

namespace Roll6.Tests.Domain.Services;

/// <summary>096: the GM mode — the check after an action, the run's start and end in the chat, the status.</summary>
public partial class TurnServiceChatTests
{
    private static readonly GmJob JOB = new(CAMPAIGN, 3, MASTER, "C");

    private void GmReady(bool connected = true, params long[] approved)
    {
        _campaign.GmMode = true;
        _campaign.Status = CampaignStatus.Active;
        _gmDispatcher.Setup(d => d.IsAgentConnected(MASTER)).Returns(connected);
        _gmDispatcher.Setup(d => d.EnqueueAsync(It.IsAny<GmJob>())).ReturnsAsync(true);
        _campaignCharacterRepository.Setup(r => r.ListByCampaignAsync(CAMPAIGN, true)).ReturnsAsync(approved
            .Select(id => new CampaignCharacter { CampaignId = CAMPAIGN, CharacterId = id, Status = CampaignCharacterStatus.Approved }).ToList());
    }

    private void Acted(params long[] characterIds) =>
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3))
            .ReturnsAsync(characterIds.Select(id => Turn.Action(CAMPAIGN, MAP, id, null, null, 3, PLAYER, "Ataco")).ToList());

    private static GmOutcome Outcome(string kind = RequestOutcomeInfo.DONE, string? message = null, string text = "",
        bool timedOut = false, bool stoppedByMaster = false, params string[] denials) =>
        new(kind, message, denials, timedOut, stoppedByMaster, text);

    [Fact]
    public async Task Check_WithTheModeOff_DoesNothing()
    {
        GmReady(connected: true, ARIA);
        Acted(ARIA);
        _campaign.GmMode = false;

        await _service.CheckAsync(CAMPAIGN, "action");

        _gmDispatcher.Verify(d => d.EnqueueAsync(It.IsAny<GmJob>()), Times.Never);
    }

    [Fact]
    public async Task Check_WhileSomeoneIsMissing_DoesNothing()
    {
        GmReady(connected: true, ARIA, BRAM);
        Acted(ARIA);

        await _service.CheckAsync(CAMPAIGN, "action");

        _gmDispatcher.Verify(d => d.EnqueueAsync(It.IsAny<GmJob>()), Times.Never);
    }

    [Fact]
    public async Task Check_WhenEveryoneActed_QueuesTheTurnForTheMastersConsole()
    {
        GmReady(connected: true, ARIA, BRAM);
        Acted(ARIA, BRAM);

        await _service.CheckAsync(CAMPAIGN, "action");

        _gmDispatcher.Verify(d => d.EnqueueAsync(JOB), Times.Once);
    }

    [Fact]
    public async Task Check_WithoutConsole_NotActive_OrWithoutApprovedCharacters_DoesNothing()
    {
        GmReady(connected: false, ARIA);
        Acted(ARIA);
        await _service.CheckAsync(CAMPAIGN, "action");

        GmReady(connected: true, ARIA);
        _campaign.Status = CampaignStatus.Paused;
        await _service.CheckAsync(CAMPAIGN, "action");

        GmReady(connected: true);
        _campaign.Status = CampaignStatus.Active;
        await _service.CheckAsync(CAMPAIGN, "action");

        _gmDispatcher.Verify(d => d.EnqueueAsync(It.IsAny<GmJob>()), Times.Never);
    }

    [Fact]
    public async Task Check_NeverThrowsIntoTheCaller()
    {
        GmReady(connected: true, ARIA);
        Acted(ARIA);
        _gmDispatcher.Setup(d => d.EnqueueAsync(It.IsAny<GmJob>())).ThrowsAsync(new InvalidOperationException("boom"));

        var act = () => _service.CheckAsync(CAMPAIGN, "action");

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task CheckOwner_LooksAtTheCampaignsWithTheModeOnly()
    {
        _campaignRepository.Setup(r => r.ListGmModeIdsByOwnerAsync(MASTER)).ReturnsAsync(new List<long> { CAMPAIGN });
        GmReady(connected: true, ARIA);
        Acted(ARIA);

        await _service.CheckOwnerAsync(MASTER);

        _gmDispatcher.Verify(d => d.EnqueueAsync(JOB), Times.Once);
    }

    [Fact]
    public async Task TheLastActionOfACompleteTurn_HandsItToTheGm()
    {
        GmReady(connected: true, ARIA);
        Acted(ARIA);

        await _service.ActAsync(PLAYER, new TurnActInfo { CampaignId = CAMPAIGN, CharacterId = ARIA, Description = "Ataco o goblin" });

        _gmDispatcher.Verify(d => d.EnqueueAsync(JOB), Times.Once);
    }

    [Fact]
    public async Task Started_WritesTheLineAndTellsTheTable()
    {
        await _service.StartedAsync(JOB);

        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == TurnType.GmNotice && t.UserId == MASTER && t.CharacterId == null
            && t.TurnNo == 3 && t.MapId == MAP && t.Description == "O GM começou a processar o turno 3.")), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.CHAT_MESSAGE)), Times.Once);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.GM_CHANGED)), Times.Once);
        _queue.Verify(q => q.Enqueue(It.IsAny<TableNotice>()), Times.Never, "no notice for a line of the GM");
    }

    [Fact]
    public async Task Complete_WhenTheTurnAdvanced_SaysNothingMore()
    {
        _campaign.CurrentTurn = 4;

        await _service.CompleteAsync(JOB, Outcome(text: "Turno fechado."));

        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
        _queue.Verify(q => q.Enqueue(It.IsAny<TableNotice>()), Times.Never);
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.GM_CHANGED)), Times.Once);
    }

    [Fact]
    public async Task Complete_WithTheTurnStillOpen_ExplainsAndTellsTheMaster()
    {
        await _service.CompleteAsync(JOB, Outcome(text: "Faltam ações de: Bram."));

        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == TurnType.GmNotice
            && t.Description == "O GM terminou sem fechar o turno 3: Faltam ações de: Bram.")), Times.Once);
        _queue.Verify(q => q.Enqueue(It.Is<TableNotice>(n => n.Kind == NoticeKind.Gm && n.CampaignId == CAMPAIGN
            && n.TargetUserIds!.Contains(MASTER) && n.Body.StartsWith("GM: o turno 3 não foi fechado"))), Times.Once);
    }

    [Fact]
    public async Task Complete_TheEndings()
    {
        TurnService.GmEnding(3, Outcome(text: GmTurn.GM_NOT_CONFIGURED)).Should().Be((GmTurn.NotConfigured(3), "a skill gm não está configurada no repositório do mestre"));
        TurnService.GmEnding(3, Outcome(kind: RequestOutcomeInfo.FAILED, message: "O agente caiu.", denials: "WebFetch"))
            .Should().Be(("O GM falhou no turno 3: O agente caiu. (ferramentas negadas: WebFetch).", "O agente caiu. (ferramentas negadas: WebFetch)"));
        TurnService.GmEnding(3, Outcome(kind: RequestOutcomeInfo.STOPPED, stoppedByMaster: true)).Should().Be(("O GM foi interrompido.", null));
        TurnService.GmEnding(3, Outcome(kind: RequestOutcomeInfo.STOPPED, timedOut: true)).Should().Be((GmTurn.TimedOut(3), GmTurn.TIMED_OUT));
        TurnService.GmEnding(3, Outcome(kind: RequestOutcomeInfo.STOPPED)).Line.Should().Be("O GM falhou no turno 3: o pedido falhou.");
    }

    [Fact]
    public async Task Complete_StoppedByTheMaster_LeavesALineAndNoNotice()
    {
        await _service.CompleteAsync(JOB, Outcome(kind: RequestOutcomeInfo.STOPPED, stoppedByMaster: true));

        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.Description == "O GM foi interrompido.")), Times.Once);
        _queue.Verify(q => q.Enqueue(It.IsAny<TableNotice>()), Times.Never);
    }

    [Fact]
    public async Task Status_CarriesTheRunningTurn()
    {
        _askDispatcher.Setup(d => d.IsAgentConnected(MASTER)).Returns(true);
        _gmDispatcher.Setup(d => d.RunningTurnOf(CAMPAIGN)).Returns(3);

        var status = await _service.StatusAsync(PLAYER, CAMPAIGN);

        status.Available.Should().BeTrue();
        status.GmRunningTurn.Should().Be(3);
    }

    [Fact]
    public async Task AGmLineInTheChat_IsAPlainLineOfTheGm()
    {
        var line = Turn.GmNotice(CAMPAIGN, MAP, 3, MASTER, GmTurn.Started(3));
        line.TurnId = 901;
        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, 51, It.IsAny<long>(), It.IsAny<bool>(), It.IsAny<IReadOnlyCollection<int>?>()))
            .ReturnsAsync(new List<Turn> { line });

        var page = await _service.ListAsync(PLAYER, CAMPAIGN, null, null, null);

        var item = page.Items.Single();
        item.Kind.Should().Be("gm");
        item.DisplayName.Should().Be("GM");
        item.Text.Should().Be("O GM começou a processar o turno 3.");
        item.CanReply.Should().BeFalse();
        item.CanReact.Should().BeFalse();
        item.CanDelete.Should().BeFalse();
        item.CanConvert.Should().BeNull();
    }
}
