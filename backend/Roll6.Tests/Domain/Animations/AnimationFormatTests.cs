using System.Text.Json;
using FluentAssertions;
using Roll6.Domain.Animations;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;

namespace Roll6.Tests.Domain.Animations;

/// <summary>
/// The animation file format (059) over the cases shared with the frontend (<c>lib/animationFormat.test.ts</c>) and the
/// <c>criar-animacao</c> skill: <c>specs/059-token-animation-library/fixtures/</c>, copied next to the tests.
/// </summary>
public class AnimationFormatTests
{
    private static readonly string FIXTURES = Path.Combine(AppContext.BaseDirectory, "Fixtures", "Animations");

    private static JsonElement Fixture(string name) =>
        JsonDocument.Parse(File.ReadAllText(Path.Combine(FIXTURES, name))).RootElement.Clone();

    public static IEnumerable<object[]> InvalidCases() =>
        JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(FIXTURES, "expected.json")))!
            .Select(pair => new object[] { pair.Key, pair.Value });

    [Fact]
    public void Knows_The52MixamoBones()
    {
        AnimationFormat.BONES.Should().HaveCount(52).And.Contain("LeftHandPinky3").And.NotContain("HeadTop_End");
    }

    [Theory]
    [InlineData("aceno.json", 1, true, AnimationType.Idle)]
    [InlineData("roll6-parado.json", 3, true, AnimationType.Idle)]
    [InlineData("roll6-caminhada.json", 1, true, AnimationType.Walk)]
    [InlineData("roll6-guarda.json", 2, true, AnimationType.Idle)]
    [InlineData("roll6-morte.json", 1.4, false, AnimationType.Defeated)]
    public void Parse_ValidFiles_ReadsDurationLoopAndSuggestedType(string name, double duration, bool loop, AnimationType type)
    {
        var file = AnimationFormat.Parse(Fixture(name));

        file.Duration.Should().Be(duration);
        file.Loop.Should().Be(loop);
        file.Type.Should().Be(type);
    }

    [Theory]
    [MemberData(nameof(InvalidCases))]
    public void Parse_InvalidFiles_ReportTheSharedKey(string name, string key)
    {
        var act = () => AnimationFormat.Parse(Fixture(name));

        act.Should().Throw<DomainValidationException>().Which.Errors.Keys.Should().Equal(key);
    }

    [Fact]
    public void Parse_OverOneMegabyte_IsRefusedOnContent()
    {
        var big = new string('x', AnimationFormat.MAX_BYTES);
        var content = JsonDocument.Parse($$"""{ "format": "roll6-animation", "description": "{{big}}" }""").RootElement;

        var act = () => AnimationFormat.Parse(content);

        act.Should().Throw<DomainValidationException>().Which.Errors.Keys.Should().Equal("content");
    }

    [Fact]
    public void Serialize_IsCompact()
    {
        var bytes = AnimationFormat.Serialize(Fixture("aceno.json"));

        System.Text.Encoding.UTF8.GetString(bytes).Should().StartWith("{\"format\":\"roll6-animation\",\"version\":1,");
    }
}
