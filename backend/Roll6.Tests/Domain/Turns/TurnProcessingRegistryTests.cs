using FluentAssertions;
using Roll6.Domain.Turns;

namespace Roll6.Tests.Domain.Turns;

/// <summary>101: the in-memory "processing turn N" notice and its lines.</summary>
public class TurnProcessingRegistryTests
{
    private static readonly DateTime NOW = new(2026, 10, 22, 20, 0, 0, DateTimeKind.Utc);
    private readonly TurnProcessingRegistry _registry = new();

    [Fact]
    public void Start_SameLiveTurn_IsNotNew()
    {
        _registry.Start(1, 7, 10, NOW).Should().BeTrue();
        _registry.Start(1, 7, 10, NOW.AddMinutes(5)).Should().BeFalse();
        _registry.Current(1, 7, NOW.AddMinutes(5)).Should().Be((7, NOW + TurnProcessingRegistry.TIMEOUT));
    }

    [Fact]
    public void Start_AnotherTurnOrExpired_IsNew()
    {
        _registry.Start(1, 7, 10, NOW);
        _registry.Start(1, 8, 10, NOW).Should().BeTrue();
        _registry.Start(1, 8, 10, NOW.AddMinutes(31)).Should().BeTrue();
    }

    [Fact]
    public void Current_OnlyForTheCurrentTurnAndBeforeTheTimeout()
    {
        _registry.Start(1, 7, 10, NOW);

        _registry.Current(2, 7, NOW).Should().BeNull();
        _registry.Current(1, 8, NOW).Should().BeNull();
        _registry.Current(1, 7, NOW).Should().BeNull("the stale entry was dropped by the previous read");

        _registry.Start(1, 7, 10, NOW);
        _registry.Current(1, 7, NOW.AddMinutes(30)).Should().BeNull();
    }

    [Fact]
    public void Stop_ReturnsTheLiveTurnOnly()
    {
        _registry.Stop(1, 7, NOW).Should().BeNull();
        _registry.Start(1, 7, 10, NOW);
        _registry.Stop(1, 7, NOW).Should().Be(7);
        _registry.Current(1, 7, NOW).Should().BeNull();

        _registry.Start(1, 7, 10, NOW);
        _registry.Stop(1, 8, NOW).Should().BeNull("the turn already moved on");
    }

    [Fact]
    public void Clear_Forgets()
    {
        _registry.Start(1, 7, 10, NOW);
        _registry.Clear(1);
        _registry.Current(1, 7, NOW).Should().BeNull();
    }

    [Fact]
    public void Texts()
    {
        TurnProcessingTexts.Started(7).Should().Be("O mestre começou a processar o turno 7.");
        TurnProcessingTexts.Stopped(7, null).Should().Be("O mestre interrompeu o processamento do turno 7.");
        TurnProcessingTexts.Stopped(7, "  ").Should().Be("O mestre interrompeu o processamento do turno 7.");
        TurnProcessingTexts.Stopped(7, "falta a ação do Bram.").Should().Be("O mestre interrompeu o processamento do turno 7: falta a ação do Bram.");
    }
}
