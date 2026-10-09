using FluentAssertions;
using Roll6.Domain.Notifications;

namespace Roll6.Tests.Domain.Notifications;

public class MajorityTests
{
    [Theory]
    [InlineData(1, 1)]
    [InlineData(2, 1)]
    [InlineData(3, 2)]
    [InlineData(4, 2)]
    [InlineData(5, 3)]
    public void Threshold_IsHalfRoundedUp(int characters, int threshold) =>
        Majority.Threshold(characters).Should().Be(threshold);

    [Fact]
    public void Crossed_OnlyAtTheActionThatReachesIt()
    {
        Majority.Crossed(4, 1, 2).Should().BeTrue();
        Majority.Crossed(4, 2, 3).Should().BeFalse();
        Majority.Crossed(4, 0, 1).Should().BeFalse();
        Majority.Crossed(3, 1, 2).Should().BeTrue();
        Majority.Crossed(5, 2, 3).Should().BeTrue();
    }

    [Fact]
    public void Crossed_NeverWhenNobodyIsMissing()
    {
        Majority.Crossed(1, 0, 1).Should().BeFalse();
        Majority.Crossed(2, 1, 2).Should().BeFalse();
        Majority.Crossed(0, 0, 0).Should().BeFalse();
    }
}
