using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class TokenTests
{
    [Theory]
    [InlineData(null, 1)]
    [InlineData(Posture.Standing, 1)]
    [InlineData(Posture.Down, 2)]
    [InlineData(Posture.OutOfCombat, 2)]
    public void SpaceFor_UsesTheDownSizeWhileLying(Posture? posture, int expected)
    {
        new Token { UpSpace = 1, DownSpace = 2 }.SpaceFor(posture).Should().Be(expected);
    }

    [Fact]
    public void SpaceFor_WithoutDownState_KeepsTheStandingSize()
    {
        new Token { UpSpace = 3, DownSpace = null }.SpaceFor(Posture.OutOfCombat).Should().Be(3);
    }
}
