using System.Text;
using System.Text.Json;
using FluentAssertions;
using Roll6Anime.Core.Animations;

namespace Roll6Anime.Tests;

/// <summary>The version history of an animation and the validated write of the pose editor (066).</summary>
public sealed class AnimationHistoryTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "roll6anime-tests", Guid.NewGuid().ToString("N"));

    public AnimationHistoryTests() => Directory.CreateDirectory(_folder);

    public void Dispose() => Directory.Delete(_folder, true);

    [Fact]
    public void TheSameContentIsNotRecordedTwice()
    {
        var history = new AnimationHistory();
        history.Observe("a").Should().BeTrue();
        history.Observe("a").Should().BeFalse();
        history.UndoCount.Should().Be(0);
        history.Current.Should().Be("a");
    }

    [Fact]
    public void UndoAndRedoGiveTheExactTexts()
    {
        var history = new AnimationHistory();
        history.Observe("v1");
        history.Observe("v2");
        history.Observe("v3");

        history.UndoCount.Should().Be(2);
        history.Undo().Should().Be("v2");
        history.Undo().Should().Be("v1");
        history.Undo().Should().BeNull();
        history.RedoCount.Should().Be(2);
        history.Redo().Should().Be("v2");
        // Writing the version back makes the folder show it again: nothing new.
        history.Observe("v2").Should().BeFalse();
    }

    [Fact]
    public void ANewVersionAfterAnUndoDropsTheRedo()
    {
        var history = new AnimationHistory();
        history.Observe("v1");
        history.Observe("v2");
        history.Undo();

        history.Observe("v3");

        history.CanRedo.Should().BeFalse();
        history.Undo().Should().Be("v1");
    }

    [Fact]
    public void KeepsAtMostTheLimit()
    {
        var history = new AnimationHistory();
        for (var i = 0; i < AnimationHistory.LIMIT + 10; i++)
            history.Observe($"v{i}");

        history.UndoCount.Should().Be(AnimationHistory.LIMIT - 1);
    }

    [Fact]
    public void TheBookFollowsRenamesAndRemovals()
    {
        var book = new AnimationHistoryBook();
        book.For("a.json").Observe("x");
        book.For("A.JSON").Current.Should().Be("x");

        book.Rename("a.json", "b.json");
        book.For("b.json").Current.Should().Be("x");
        book.For("a.json").Current.Should().BeNull();

        book.Remove("b.json");
        book.For("b.json").Current.Should().BeNull();
    }

    [Fact]
    public void AValidFileIsWrittenIndentedWithoutBom()
    {
        var path = Path.Combine(_folder, "aceno.json");
        using var document = JsonDocument.Parse("""
            { "format": "roll6-animation", "version": 1, "name": "Aceno ação", "duration": 1, "loop": true,
              "tracks": [ { "bone": "LeftArm", "times": [0, 1], "degrees": [[0, 0, -150], [0, 0, -120]] } ] }
            """);

        AnimationWriter.Write(path, document.RootElement).Should().BeNull();

        var bytes = File.ReadAllBytes(path);
        bytes.Take(3).Should().NotEqual(new byte[] { 0xEF, 0xBB, 0xBF });
        var text = Encoding.UTF8.GetString(bytes);
        text.Should().Contain("\n  \"format\": \"roll6-animation\"").And.Contain("Aceno ação");
        File.Exists(path + ".tmp").Should().BeFalse();
        AnimationFolder.Read(path, null).IsValid.Should().BeTrue();
    }

    [Fact]
    public void AnInvalidFileIsNotWrittenAndSaysWhy()
    {
        var path = Path.Combine(_folder, "aceno.json");
        File.WriteAllText(path, "original");
        using var document = JsonDocument.Parse("""
            { "format": "roll6-animation", "version": 1, "duration": 1, "loop": true,
              "tracks": [ { "bone": "Tail", "times": [0], "degrees": [[0, 0, 0]] } ] }
            """);

        var error = AnimationWriter.Write(path, document.RootElement);

        error.Should().NotBeNull();
        error!.Key.Should().StartWith("content.tracks[0].bone");
        File.ReadAllText(path).Should().Be("original");
    }

    [Fact]
    public void AVersionIsWrittenBackByteForByte()
    {
        var path = Path.Combine(_folder, "aceno.json");
        var text = "{ \"keep\": \"ção\" }\r\n";

        AnimationWriter.WriteText(path, text);

        new UTF8Encoding(false).GetString(File.ReadAllBytes(path)).Should().Be(text);
        AnimationFolder.Read(path, null).Text.Should().Be(text);
    }
}
