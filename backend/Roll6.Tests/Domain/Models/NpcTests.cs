using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class NpcTests
{
    [Fact]
    public void Update_StoresTheValues()
    {
        var npc = new Npc();

        npc.Update(5, " Goblin ", 7, 2, 6, "Faca", null);

        (npc.TokenId, npc.Name, npc.Life, npc.Energy, npc.Move, npc.Sheet).Should().Be((5L, "Goblin", 7, 2, 6, "Faca"));
    }

    [Theory]
    [InlineData(0, "Goblin", 1, 1, 1, "tokenId")]
    [InlineData(5, "  ", 1, 1, 1, "name")]
    [InlineData(5, "Goblin", -1, 1, 1, "life")]
    [InlineData(5, "Goblin", 1, -1, 1, "energy")]
    [InlineData(5, "Goblin", 1, 1, -1, "move")]
    public void Update_InvalidValues_Throw(long tokenId, string name, int life, int energy, int move, string field)
    {
        var act = () => new Npc().Update(tokenId, name, life, energy, move, null, null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }

    [Fact]
    public void NewNpc_StartsStanding()
    {
        new Npc().Posture.Should().Be(Posture.Standing);
    }

    [Theory]
    [InlineData(1, Posture.Standing)]
    [InlineData(2, Posture.Down)]
    [InlineData(3, Posture.OutOfCombat)]
    public void Update_StoresThePosture(int posture, Posture expected)
    {
        var npc = new Npc();

        npc.Update(5, "Goblin", 7, 2, 6, null, null, null, posture);

        npc.Posture.Should().Be(expected);
    }

    [Fact]
    public void Update_WithoutPosture_GoesBackToStanding()
    {
        var npc = new Npc { Posture = Posture.Down };

        npc.Update(5, "Goblin", 7, 2, 6, null, null);

        npc.Posture.Should().Be(Posture.Standing);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    [InlineData(-1)]
    public void Update_InvalidPosture_Throws(int posture)
    {
        var act = () => new Npc().Update(5, "Goblin", 1, 1, 1, null, null, null, posture);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("posture");
    }

    [Fact]
    public void Update_StoresTheTrimmedStatus()
    {
        var npc = new Npc();

        npc.Update(5, "Goblin", 7, 2, 6, null, null, " ferido ");

        npc.Status.Should().Be("ferido");
    }

    [Fact]
    public void Update_TooLongStatus_Throws()
    {
        var act = () => new Npc().Update(5, "Goblin", 1, 1, 1, null, null, new string('x', 261));

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("status");
    }

    [Fact]
    public void Update_TooLongSheetOrInvalidImage_Throws()
    {
        var longSheet = () => new Npc().Update(5, "Goblin", 1, 1, 1, new string('x', 20001), null);
        var badImage = () => new Npc().Update(5, "Goblin", 1, 1, 1, null, "../etc/passwd");

        longSheet.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("sheet");
        badImage.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("image");
    }
}
