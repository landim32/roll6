using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Turns;

namespace Roll6.Tests.Domain.Turns;

/// <summary>The turn summary (024): the example of the spec is the reference output.</summary>
public class TurnSummaryTests
{
    private static SummaryLine Line(TurnType type, string actor, string? author = null) => new() { Type = type, Actor = actor, Author = author };

    [Fact]
    public void Build_ReproducesTheExampleOfTheSpec()
    {
        var lines = new[]
        {
            Line(TurnType.Movement, "Cedric (José)") with
            {
                Before = (2, 11, 4), After = (2, 12, 3), Moved = 3, MovedTotal = 3
            },
            Line(TurnType.CharacterUpdate, "Cedric (José)", "GM (Rodrigo)") with
            {
                Changes = new[]
                {
                    new TurnChange("currentLife", "10", "6"),
                    new TurnChange("currentEnergy", "8", "5"),
                    new TurnChange("characterStatus", "-1 de redutor de dano no próximo turno", "Agachado")
                }
            },
            Line(TurnType.Action, "Comam (Rodrigo)") with { Description = "Vou largar minha picareta e fazer um saque rápido da minha espada" }
        };
        var positions = new[]
        {
            new SummaryPosition("Goblin (GM)", 5, 11, 2),
            new SummaryPosition("Cedric (José)", 2, 12, 3),
            new SummaryPosition("Comam (Rodrigo)", 3, 13, 1)
        };

        TurnSummary.Build(lines, positions).Should().Be(string.Join("\n",
            "## Ações",
            "Cedric (José): Moveu de (2, 11) olhando para o Sudoeste para (2, 12) olhando para o Sul, gastou 3 pontos de movimento (3)",
            "GM (Rodrigo): Alterou Cedric (José): Vida de 10 para 6; Energia de 8 para 5; Status de \"-1 de redutor de dano no próximo turno\" para \"Agachado\"",
            "Comam (Rodrigo): \"Vou largar minha picareta e fazer um saque rápido da minha espada\"",
            "## Posições",
            "- Cedric (José) - (2, 12) - Sul",
            "- Comam (Rodrigo) - (3, 13) - Nordeste",
            "- Goblin (GM) - (5, 11) - Sudeste",
            ""));
    }

    [Fact]
    public void Build_EmptyTurn_SaysSoAndStillListsThePositions()
    {
        var text = TurnSummary.Build(Array.Empty<SummaryLine>(), new[] { new SummaryPosition("Cedric (José)", 1, 1, 0) });

        text.Should().Be("## Ações\nNenhuma ação registrada.\n## Posições\n- Cedric (José) - (1, 1) - Norte\n");
    }

    [Fact]
    public void Build_OwnerChangingTheirOwnCharacter_WritesAlterouWithoutRepeatingTheName()
    {
        var line = Line(TurnType.CharacterUpdate, "Cedric (José)") with { Changes = new[] { new TurnChange("notes", "a", "b") } };

        TurnSummary.Build(new[] { line }, Array.Empty<SummaryPosition>())
            .Should().Contain("Cedric (José): Alterou: Anotações alteradas\n")
            .And.Contain("## Posições\nNenhuma peça no mapa.\n");
    }

    [Fact]
    public void Build_TotalsAndEmptyValues_UseReadableLabels()
    {
        var character = Line(TurnType.CharacterUpdate, "Cedric (José)") with
        {
            Changes = new[] { new TurnChange("life", "12", "10"), new TurnChange("move", "5", "6"), new TurnChange("characterStatus", null, "Agachado") }
        };
        var npc = Line(TurnType.CharacterUpdate, "Goblin (GM)", "GM (Rodrigo)") with
        {
            IsNpc = true, Changes = new[] { new TurnChange("life", "7", "3"), new TurnChange("name", "Goblin", "Goblin chefe") }
        };

        var text = TurnSummary.Build(new[] { character, npc }, Array.Empty<SummaryPosition>());

        text.Should().Contain("Cedric (José): Alterou: Vida total de 12 para 10; Movimento de 5 para 6; Status de (vazio) para \"Agachado\"");
        text.Should().Contain("GM (Rodrigo): Alterou Goblin (GM): Vida de 7 para 3; Nome de \"Goblin\" para \"Goblin chefe\"");
    }

    [Fact]
    public void Build_MoveWithoutPoints_OmitsTheCost_AndResultsNameTheAuthor()
    {
        var move = Line(TurnType.Movement, "Goblin (GM)") with { Before = (1, 1, 0), After = (1, 0, 5) };
        var result = Line(TurnType.ActionResult, "Cedric (José)", "GM (Rodrigo)") with { Description = "Acertou: 6 de dano" };

        var text = TurnSummary.Build(new[] { move, result }, Array.Empty<SummaryPosition>());

        text.Should().Contain("Goblin (GM): Moveu de (1, 1) olhando para o Norte para (1, 0) olhando para o Noroeste\n");
        text.Should().Contain("GM (Rodrigo): Resultado para Cedric (José): Acertou: 6 de dano\n");
    }

    [Fact]
    public void Build_EscapesMarkdownInNamesAndTexts()
    {
        var line = Line(TurnType.Action, "*Zed* (_ana_)") with { Description = "# grito [alto]" };

        TurnSummary.Build(new[] { line }, Array.Empty<SummaryPosition>())
            .Should().Contain("\\*Zed\\* (\\_ana\\_): \"\\# grito \\[alto\\]\"");
    }

    [Theory]
    [InlineData(0, "Norte")]
    [InlineData(1, "Nordeste")]
    [InlineData(2, "Sudeste")]
    [InlineData(3, "Sul")]
    [InlineData(4, "Sudoeste")]
    [InlineData(5, "Noroeste")]
    public void Direction_FollowsTheLookIndex(int look, string name)
    {
        TurnSummary.Direction(look).Should().Be(name);
    }

    // ---- 027: narration and the actions section alone ----

    [Fact]
    public void Build_Narration_NamesTheMaster()
    {
        var line = new SummaryLine { Type = TurnType.Narration, Author = "GM (Rodrigo)", Description = "O goblin *fugiu*." };

        TurnSummary.Build(new[] { line }, Array.Empty<SummaryPosition>())
            .Should().Contain("GM (Rodrigo):\n\nO goblin *fugiu*.\n");
    }

    [Fact]
    public void Build_Narration_KeepsMarkdownAndDoesNotSwallowTheNextEntry()
    {
        var lines = new[]
        {
            new SummaryLine
            {
                Type = TurnType.Narration,
                Author = "GM (Rodrigo)",
                Description = "*TURNO 1 — ARENA*\n\n*Comam* avança.\n\n---\n\n*Resumo*\n\n- Comam: Defesa Total."
            },
            Line(TurnType.Action, "Cedric (José)") with { Description = "Ataca" }
        };

        TurnSummary.BuildActions(lines).Should().Be(string.Join("\n",
            "## Ações",
            "GM (Rodrigo):",
            "",
            "*TURNO 1 — ARENA*",
            "",
            "*Comam* avança.",
            "",
            "---",
            "",
            "*Resumo*",
            "",
            "- Comam: Defesa Total.",
            "",
            "Cedric (José): \"Ataca\"",
            ""));
    }

    [Fact]
    public void BuildActions_IsTheFirstSectionOfBuild()
    {
        var lines = new[] { new SummaryLine { Type = TurnType.Action, Actor = "Cedric (José)", Description = "Ataca" } };
        var positions = new[] { new SummaryPosition("Cedric (José)", 1, 1, 0) };

        var actions = TurnSummary.BuildActions(lines);

        actions.Should().Be("## Ações\nCedric (José): \"Ataca\"\n");
        TurnSummary.Build(lines, positions).Should().StartWith(actions);
    }
}
