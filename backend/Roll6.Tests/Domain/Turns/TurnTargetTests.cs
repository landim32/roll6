using FluentAssertions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Turns;

/// <summary>The action's target snapshot (098): factories, labels and the text of the summary line.</summary>
public class TurnTargetTests
{
    [Fact]
    public void EmptyHex_DescribesHexAndDistance()
    {
        var target = TurnTarget.Hex(12, 4, 5);
        target.IsEmptyHex.Should().BeTrue();
        target.Describe().Should().Be("o hex (12, 4), a 5 hexes");
        target.KindLabel().Should().BeNull();
        target.SideLabel().Should().BeNull();
    }

    [Fact]
    public void OneHex_IsSingular()
    {
        TurnTarget.Hex(1, 1, 1).Describe().Should().Be("o hex (1, 1), a 1 hex");
    }

    [Fact]
    public void OwnPiece_IsSelf()
    {
        var target = TurnTarget.Piece(4, 4, 0, 120, TurnTarget.KIND_CHARACTER, TurnTarget.SIDE_SELF, "Cedric", characterId: 9, look: 3);
        target.Describe().Should().Be("si mesmo em (4, 4)");
        target.SideLabel().Should().Be("si mesmo");
    }

    [Fact]
    public void StandingEnemyNpc_WithoutStatus()
    {
        var target = TurnTarget.Piece(9, 7, 3, 133, TurnTarget.KIND_NPC, TurnTarget.SIDE_ENEMY, "Goblin guerreiro",
            mapNpcId: 41, look: 2, posture: 1, status: "  ", currentLife: 12, totalLife: 12, currentEnergy: 10, totalEnergy: 10);
        target.Status.Should().BeNull();
        target.Describe().Should().Be("Goblin guerreiro (inimigo, NPC) em (9, 7), a 3 hexes, olhando para o Sudeste, PV 12/12, Fadiga 10/10");
    }

    [Fact]
    public void DownAllyCharacter_WithVitalsAndStatus()
    {
        var target = TurnTarget.Piece(9, 7, 3, 133, TurnTarget.KIND_CHARACTER, TurnTarget.SIDE_ALLY, "Aria",
            characterId: 5, look: 2, posture: 2, status: "atordoado", currentLife: 5, totalLife: 12, currentEnergy: 3, totalEnergy: 10);
        target.Describe().Should().Be(
            "Aria (aliado, personagem) em (9, 7), a 3 hexes, olhando para o Sudeste, Caído, PV 5/12, Fadiga 3/10, status: \"atordoado\"");
        target.PostureLabel().Should().Be("Caído");
        target.KindLabel().Should().Be("personagem");
    }

    [Fact]
    public void Object_HasOnlyNameAndPlace()
    {
        var target = TurnTarget.Piece(2, 2, 2, 50, TurnTarget.KIND_OBJECT, TurnTarget.SIDE_OBJECT, "Baú", look: 0);
        target.Describe().Should().Be("Baú (objeto, objeto) em (2, 2), a 2 hexes, olhando para o Norte");
    }
}
