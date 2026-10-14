using FluentAssertions;
using Roll6.Domain.Animations;
using Roll6.Domain.Enums;

namespace Roll6.Tests.Domain.Animations;

public class AnimationStatesTests
{
    [Theory]
    [InlineData("animation:12", 12L)]
    [InlineData("animation:1", 1L)]
    [InlineData("animation:0", null)]
    [InlineData("animation:x", null)]
    [InlineData("animation:", null)]
    [InlineData("animation: 3", null)]
    [InlineData("clip:animation:3", null)]
    [InlineData("roll6", null)]
    [InlineData(null, null)]
    public void ParseChoice_OnlyPositiveIds(string? choice, long? id)
    {
        AnimationStates.ParseChoice(choice).Should().Be(id);
    }

    [Fact]
    public void Choice_RoundTrips()
    {
        AnimationStates.ParseChoice(AnimationStates.Choice(42)).Should().Be(42);
    }

    [Theory]
    [InlineData("modelIdleClip", AnimationType.Idle)]
    [InlineData("modelWalkClip", AnimationType.Walk)]
    [InlineData("modelDownClip", AnimationType.Defeated)]
    public void TypeFor_EachStateTakesOneType(string field, AnimationType type)
    {
        AnimationStates.TypeFor(field).Should().Be(type);
        AnimationStates.FieldOf(type).Should().Be(field);
    }

    [Theory]
    [InlineData(AnimationType.Run)]
    [InlineData(AnimationType.Crouch)]
    [InlineData(AnimationType.Attack)]
    [InlineData(AnimationType.Defend)]
    public void FieldOf_TypesWithoutAStateFeedNone(AnimationType type)
    {
        AnimationStates.FieldOf(type).Should().BeNull();
    }
}
