using FluentAssertions;
using Roll6.Domain.Gm;

namespace Roll6.Tests.Domain.Gm;

/// <summary>The pure rules of the GM mode (096): a complete turn and the chat lines.</summary>
public class GmTurnTests
{
    [Fact]
    public void ATurnIsCompleteWhenEveryApprovedCharacterActed()
    {
        GmTurn.Complete(new[] { 1L, 2L }, new HashSet<long> { 1, 2 }).Should().BeTrue();
        GmTurn.Complete(new[] { 1L, 2L }, new HashSet<long> { 1, 2, 9 }).Should().BeTrue("an NPC or a removed character does not matter");
        GmTurn.Complete(new[] { 1L, 2L }, new HashSet<long> { 1 }).Should().BeFalse();
        GmTurn.Complete(Array.Empty<long>(), new HashSet<long>()).Should().BeFalse("nobody to wait for is not a turn to close");
    }

    [Fact]
    public void TheLinesAreOneSentenceEach()
    {
        GmTurn.Started(7).Should().Be("O GM começou a processar o turno 7.");
        GmTurn.Stopped().Should().Be("O GM foi interrompido.");
        GmTurn.Failed(7, "O agente caiu.").Should().Be("O GM falhou no turno 7: O agente caiu.");
        GmTurn.Failed(7, "sem rede").Should().Be("O GM falhou no turno 7: sem rede.");
        GmTurn.TimedOut(7).Should().Be("O GM falhou no turno 7: demorou demais (mais de 10 minutos).");
        GmTurn.NotConfigured(7).Should().Contain("skill gm não está configurada");
        GmTurn.NotClosed(7, "Faltam ações de: Aria").Should().Be("O GM terminou sem fechar o turno 7: Faltam ações de: Aria");
        GmTurn.NotClosed(7, "   ").Should().Be("O GM terminou sem fechar o turno 7.");
    }

    [Fact]
    public void ALongAnswerIsQuotedShortAndOnOneLine()
    {
        var line = GmTurn.NotClosed(7, "Primeira linha.\n\nSegunda   linha " + new string('x', 500));
        line.Should().StartWith("O GM terminou sem fechar o turno 7: Primeira linha. Segunda linha x");
        line.Should().NotContain("\n");
        line.Length.Should().BeLessOrEqualTo(GmTurn.MAX_LINE);
        line.Should().EndWith("…");
        GmTurn.Excerpt("a\tb\r\nc", 10).Should().Be("a b c");
        GmTurn.Excerpt(new string('a', 30), 10).Should().Be(new string('a', 9) + "…");
    }

    [Fact]
    public void TheFailureReasonNamesTheRefusedTools()
    {
        GmTurn.FailureReason(null, Array.Empty<string>()).Should().Be("o pedido falhou");
        GmTurn.FailureReason("  O agente caiu. ", Array.Empty<string>()).Should().Be("O agente caiu.");
        GmTurn.FailureReason("x", new[] { "Bash(git:*)", "WebFetch" }).Should().Be("x (ferramentas negadas: Bash(git:*), WebFetch)");
    }
}
