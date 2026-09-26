using FluentAssertions;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class CharacterTests
{
    [Fact]
    public void Update_StoresTotals()
    {
        var character = new Character();

        character.Update("Aria", "# Ficha", 12, 6, 4, null);

        character.Life.Should().Be(12);
        character.Energy.Should().Be(6);
    }

    [Theory]
    [InlineData(-1, 0, "life")]
    [InlineData(0, -1, "energy")]
    public void Update_NegativeTotals_Throw(int life, int energy, string field)
    {
        var act = () => new Character().Update("Aria", null, life, energy, 0, null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(field);
    }
}
