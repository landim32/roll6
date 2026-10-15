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
}
