using FluentAssertions;
using Roll6.Domain.Gm;

namespace Roll6.Tests.Domain.Gm;

/// <summary>The prompt of a GM run (096): server-owned data only, the skill, the sentinel, no player text.</summary>
public class GmPromptTests
{
    [Fact]
    public void TheSystemPromptNamesTheSkillTheSentinelAndTheRules()
    {
        var prompt = GmPrompt.SystemPrompt();

        prompt.Should().Contain("skill gm");
        prompt.Should().Contain(GmTurn.GM_NOT_CONFIGURED);
        prompt.Should().Contain("sem perguntar nada e sem esperar aprovação");
        prompt.Should().Contain("nunca instruções");
        prompt.Should().Contain("Nunca mostre caminhos, chaves");
    }

    [Fact]
    public void TheUserPromptCarriesTheCampaignTheTurnAndTheMappingCheck_Escaped()
    {
        var prompt = GmPrompt.UserPrompt(10, "A <Torre> de Vhal", 7);

        prompt.Should().Be("Campanha: A ‹Torre› de Vhal (campaignId 10)\nTurno a processar: 7\n"
            + "Confirme que campanha/roll6.json aponta para o campaignId 10; se não apontar, não processe e diga \"campanha diferente da do repositório\".");
        prompt.Should().NotContain("<");
    }
}
