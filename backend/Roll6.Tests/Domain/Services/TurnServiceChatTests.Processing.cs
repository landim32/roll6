using FluentAssertions;
using Moq;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;
using Roll6.Domain.Notifications;
using Roll6.DTO.Realtime;
using Roll6.DTO.Turn;

namespace Roll6.Tests.Domain.Services;

/// <summary>101: the master's "processing turn N" notice.</summary>
public partial class TurnServiceChatTests
{
    private static readonly TurnProcessingInfo START = new() { Processing = true };

    private void VerifyLine(string text, Times times) =>
        _repository.Verify(r => r.InsertAsync(It.Is<Turn>(t => t.TurnType == TurnType.GmNotice && t.UserId == MASTER
            && t.CharacterId == null && t.TurnNo == 3 && t.Description == text)), times);

    private void VerifyProcessingEvent(Times times) =>
        _notifier.Verify(n => n.PublishAsync(It.Is<TableEventInfo>(e => e.Type == TableEventType.TURN_PROCESSING)), times);

    [Fact]
    public async Task Processing_Start_WritesTheBlueLineOnceAndShowsInTheStatus()
    {
        _campaign.Status = CampaignStatus.Active;

        var first = await _service.SetProcessingAsync(MASTER, CAMPAIGN, START);
        var again = await _service.SetProcessingAsync(MASTER, CAMPAIGN, START);

        first.ProcessingTurn.Should().Be(3);
        first.ProcessingUntil.Should().BeAfter(DateTime.UtcNow.AddMinutes(29));
        again.ProcessingTurn.Should().Be(3);
        VerifyLine("O mestre começou a processar o turno 3.", Times.Once());
        VerifyProcessingEvent(Times.Once());
        _queue.Verify(q => q.Enqueue(It.IsAny<TableNotice>()), Times.Never, "Q2 = A: no push");
        (await _service.StatusAsync(PLAYER, CAMPAIGN)).ProcessingTurn.Should().Be(3);
    }

    [Fact]
    public async Task Processing_EndsWhenTheTurnMovesOn()
    {
        _campaign.Status = CampaignStatus.Active;
        await _service.SetProcessingAsync(MASTER, CAMPAIGN, START);

        _campaign.CurrentTurn = 4;

        var status = await _service.StatusAsync(PLAYER, CAMPAIGN);
        (status.ProcessingTurn, status.ProcessingUntil).Should().Be((null, null));
    }

    [Fact]
    public async Task Processing_Stop_SaysWhyAndClears()
    {
        _campaign.Status = CampaignStatus.Active;
        await _service.SetProcessingAsync(MASTER, CAMPAIGN, START);

        var result = await _service.SetProcessingAsync(MASTER, CAMPAIGN, new TurnProcessingInfo { Processing = false, Reason = " falta a ação do Bram. " });

        result.ProcessingTurn.Should().BeNull();
        VerifyLine("O mestre interrompeu o processamento do turno 3: falta a ação do Bram.", Times.Once());
        VerifyProcessingEvent(Times.Exactly(2));
        (await _service.StatusAsync(PLAYER, CAMPAIGN)).ProcessingTurn.Should().BeNull();
    }

    [Fact]
    public async Task Processing_StopWithoutNotice_WritesNothing()
    {
        var result = await _service.SetProcessingAsync(MASTER, CAMPAIGN, new TurnProcessingInfo { Processing = false });

        result.ProcessingTurn.Should().BeNull();
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
        VerifyProcessingEvent(Times.Never());
    }

    [Fact]
    public async Task Processing_WhileTheGmRunsTheTurn_IsIgnored()
    {
        _campaign.Status = CampaignStatus.Active;
        _gmDispatcher.Setup(d => d.RunningTurnOf(CAMPAIGN)).Returns(3);

        var result = await _service.SetProcessingAsync(MASTER, CAMPAIGN, START);

        result.Ignored.Should().Be("gm");
        result.ProcessingTurn.Should().BeNull();
        _repository.Verify(r => r.InsertAsync(It.IsAny<Turn>()), Times.Never);
    }

    [Fact]
    public async Task Processing_Refusals()
    {
        _campaign.Status = CampaignStatus.Active;
        await _service.Invoking(s => s.SetProcessingAsync(PLAYER, CAMPAIGN, START)).Should().ThrowAsync<UnauthorizedAccessException>();
        await _service.Invoking(s => s.SetProcessingAsync(MASTER, CAMPAIGN, new TurnProcessingInfo { Processing = false, Reason = new string('x', 201) }))
            .Should().ThrowAsync<DomainValidationException>();

        _campaign.Status = CampaignStatus.Paused;
        await _service.Invoking(s => s.SetProcessingAsync(MASTER, CAMPAIGN, START)).Should().ThrowAsync<ConflictException>();
        // Stopping works in any status.
        await _service.Invoking(s => s.SetProcessingAsync(MASTER, CAMPAIGN, new TurnProcessingInfo { Processing = false })).Should().NotThrowAsync();
    }
}
