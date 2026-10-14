using System.Text.Json;
using FluentAssertions;
using Roll6Anime.Core.Animations;

namespace Roll6Anime.Tests;

/// <summary>The folder reads every shared case exactly like the Roll6 (062, FR-007, SC-003).</summary>
public sealed class AnimationFolderTests : IDisposable
{
    private static readonly string FIXTURES = Path.Combine(AppContext.BaseDirectory, "Fixtures", "Animations");
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "roll6anime-tests", Guid.NewGuid().ToString("N"));

    public AnimationFolderTests() => Directory.CreateDirectory(_folder);

    public void Dispose() => Directory.Delete(_folder, true);

    public static IEnumerable<object[]> ValidFixtures() =>
        new[] { "aceno.json", "roll6-parado.json", "roll6-caminhada.json", "roll6-guarda.json", "roll6-morte.json" }
            .Select(name => new object[] { name });

    public static IEnumerable<object[]> InvalidFixtures() =>
        JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(Path.Combine(FIXTURES, "expected.json")))!
            .Select(pair => new object[] { pair.Key, pair.Value });

    [Theory]
    [MemberData(nameof(ValidFixtures))]
    public void Read_AcceptsTheValidSamples(string name)
    {
        var entry = AnimationFolder.Read(Path.Combine(FIXTURES, name), null);

        entry.IsValid.Should().BeTrue(entry.Error?.ToString());
        entry.Content.Should().NotBeNull();
        entry.Duration.Should().BeGreaterThan(0);
        entry.Loop.Should().NotBeNull();
    }

    [Fact]
    public void Read_TakesNameTypeDurationAndLoopFromTheFile()
    {
        var entry = AnimationFolder.Read(Path.Combine(FIXTURES, "roll6-morte.json"), null);

        entry.Name.Should().Be("Morte (Roll6)");
        entry.Type.Should().Be(Roll6.Domain.Enums.AnimationType.Defeated);
        entry.Duration.Should().Be(1.4);
        entry.Loop.Should().BeFalse();
        entry.Summary.Should().Be("Derrotado · 1,4 s · uma vez");
    }

    [Theory]
    [MemberData(nameof(InvalidFixtures))]
    public void Read_RefusesTheInvalidSamplesWithTheRoll6Key(string name, string key)
    {
        var entry = AnimationFolder.Read(Path.Combine(FIXTURES, name), null);

        entry.IsValid.Should().BeFalse();
        entry.Error!.Key.Should().Be(key);
        entry.Error.Message.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Read_BrokenJsonIsContent()
    {
        var path = Write("broken.json", "{ \"format\": ");

        var entry = AnimationFolder.Read(path, null);

        entry.Error.Should().Be(new AnimationError("content", AnimationFolder.NOT_JSON));
        entry.DisplayName.Should().Be("broken");
    }

    [Fact]
    public void Read_InvalidVersionKeepsThePreviousValidContent()
    {
        var path = Write("aceno.json", File.ReadAllText(Path.Combine(FIXTURES, "aceno.json")));
        var valid = AnimationFolder.Read(path, null);
        File.WriteAllText(path, "{ \"format\": \"roll6-animation\" ");

        var invalid = AnimationFolder.Read(path, valid);

        invalid.IsValid.Should().BeFalse();
        invalid.Content.Should().NotBeNull();
        invalid.Content!.Value.GetRawText().Should().Be(valid.Content!.Value.GetRawText());
        invalid.Duration.Should().Be(valid.Duration);
    }

    [Fact]
    public void Read_AFileOver1MbIsContent()
    {
        var path = Write("big.json", "{\"pad\":\"" + new string('x', 1_048_600) + "\"}");

        AnimationFolder.Read(path, null).Error!.Key.Should().Be("content");
    }

    [Fact]
    public void List_ReadsOnlyTheJsonFilesOfTheFolderSortedByName()
    {
        Write("b.json", File.ReadAllText(Path.Combine(FIXTURES, "aceno.json")));
        Write("A.json", "{}");
        Write("notes.txt", "x");
        Directory.CreateDirectory(Path.Combine(_folder, "sub"));
        File.WriteAllText(Path.Combine(_folder, "sub", "c.json"), "{}");

        var list = AnimationFolder.List(_folder);

        list.Select(entry => entry.FileName).Should().Equal("A.json", "b.json");
        list[0].IsValid.Should().BeFalse();
        list[1].IsValid.Should().BeTrue();
    }

    [Fact]
    public void List_AMissingFolderIsEmpty()
    {
        AnimationFolder.List(Path.Combine(_folder, "missing")).Should().BeEmpty();
    }

    private string Write(string name, string text)
    {
        var path = Path.Combine(_folder, name);
        File.WriteAllText(path, text);
        return path;
    }
}
