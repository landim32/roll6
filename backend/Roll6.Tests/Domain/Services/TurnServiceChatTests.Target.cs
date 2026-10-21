using FluentAssertions;
using Moq;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Services;

/// <summary>098: the target of a whispered action is hidden with its text for whoever is not in the whisper.</summary>
public partial class TurnServiceChatTests
{
    [Fact]
    public async Task WhisperedActionWithTarget_HidesTheTargetFromOutsiders_KeepsItForTheMaster()
    {
        SetupWhisperTable();
        _repository.Setup(r => r.ListByCampaignTurnAsync(CAMPAIGN, 3)).ReturnsAsync(() =>
        {
            var action = WhisperedAction(303);
            action.Target = TurnTarget.Hex(9, 2, 5);
            return new List<Turn> { action };
        });

        var outsider = (await _service.GetStateAsync(OUTSIDER, CAMPAIGN)).Entries.Single();
        (outsider.WhisperHidden, outsider.Target).Should().Be((true, null));

        var master = (await _service.GetStateAsync(MASTER, CAMPAIGN)).Entries.Single();
        (master.WhisperHidden, master.Target!.Text).Should().Be((false, "o hex (9, 2), a 5 hexes"));

        // The chat line of the outsider does not say "→ sobre" either.
        Turn Targeted() { var a = WhisperedAction(303); a.Target = TurnTarget.Hex(9, 2, 5); return a; }
        _repository.Setup(r => r.ListChatPageAsync(CAMPAIGN, null, null, 51, OUTSIDER, false, It.IsAny<IReadOnlyCollection<int>?>()))
            .ReturnsAsync(() => new List<Turn> { Targeted() });
        _repository.Setup(r => r.ListLogByTurnsAsync(CAMPAIGN, It.IsAny<IEnumerable<int>>())).ReturnsAsync(() => new List<Turn> { Targeted() });
        var item = (await _service.ListAsync(OUTSIDER, CAMPAIGN, null, null, null)).Items.Single();
        (item.Target, item.Text!.Contains("sobre")).Should().Be((null, false));
    }
}
