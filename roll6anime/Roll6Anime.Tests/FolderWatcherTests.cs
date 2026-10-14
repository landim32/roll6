using System.Collections.Concurrent;
using FluentAssertions;
using Roll6Anime.Core.Animations;

namespace Roll6Anime.Tests;

/// <summary>The folder is followed in real time, reading each file once it stops changing (062, FR-008, R5).</summary>
public sealed class FolderWatcherTests : IDisposable
{
    private static readonly TimeSpan WAIT = TimeSpan.FromSeconds(3);
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "roll6anime-tests", Guid.NewGuid().ToString("N"));
    private readonly FolderWatcher _watcher;
    private readonly BlockingCollection<string> _events = new();

    public FolderWatcherTests()
    {
        Directory.CreateDirectory(_folder);
        _watcher = new FolderWatcher(_folder) { SettleDelay = TimeSpan.FromMilliseconds(100) };
        _watcher.FileSettled += name => _events.Add($"settled {name}");
        _watcher.FileRemoved += name => _events.Add($"removed {name}");
        _watcher.FileRenamed += (from, to) => _events.Add($"renamed {from} {to}");
        _watcher.Start();
    }

    public void Dispose()
    {
        _watcher.Dispose();
        Directory.Delete(_folder, true);
    }

    [Fact]
    public void QuickWritesToOneFileSettleOnce()
    {
        var path = Path.Combine(_folder, "a.json");
        File.WriteAllText(path, "{");
        File.WriteAllText(path, "{\"a\":");
        File.WriteAllText(path, "{\"a\":1}");

        Next().Should().Be("settled a.json");
        _events.TryTake(out var extra, TimeSpan.FromMilliseconds(400)).Should().BeFalse(extra);
    }

    [Fact]
    public void ADeletedFileIsRemoved()
    {
        var path = Path.Combine(_folder, "b.json");
        File.WriteAllText(path, "{}");
        Next().Should().Be("settled b.json");

        File.Delete(path);

        Next().Should().Be("removed b.json");
    }

    [Fact]
    public void AFileDeletedAndWrittenAgainIsAChangeNotARemoval()
    {
        var path = Path.Combine(_folder, "e.json");
        File.WriteAllText(path, "{}");
        Next().Should().Be("settled e.json");

        // How a tool rewrites a file: delete, then create.
        File.Delete(path);
        File.WriteAllText(path, "{\"a\":1}");

        Next().Should().Be("settled e.json");
        _events.TryTake(out var extra, TimeSpan.FromMilliseconds(400)).Should().BeFalse(extra);
    }

    [Fact]
    public void ARenamedFileIsRenamed()
    {
        var path = Path.Combine(_folder, "c.json");
        File.WriteAllText(path, "{}");
        Next().Should().Be("settled c.json");

        File.Move(path, Path.Combine(_folder, "d.json"));

        Next().Should().Be("renamed c.json d.json");
    }

    [Fact]
    public void OtherFilesAreIgnored()
    {
        File.WriteAllText(Path.Combine(_folder, "notes.txt"), "x");

        _events.TryTake(out var any, TimeSpan.FromMilliseconds(500)).Should().BeFalse(any);
    }

    [Fact]
    public void AFileWrittenInTwoHalvesSettlesOnceAndReadsWhole()
    {
        var path = Path.Combine(_folder, "aceno.json");
        var text = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "Animations", "aceno.json"));
        using (var stream = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
        using (var writer = new StreamWriter(stream))
        {
            writer.Write(text[..(text.Length / 2)]);
            writer.Flush();
            Thread.Sleep(50);
            writer.Write(text[(text.Length / 2)..]);
        }

        Next().Should().Be("settled aceno.json");
        _events.TryTake(out var extra, TimeSpan.FromMilliseconds(400)).Should().BeFalse(extra);
        AnimationFolder.Read(path, null).IsValid.Should().BeTrue();
    }

    private string Next()
    {
        _events.TryTake(out var next, WAIT).Should().BeTrue("an event was expected");
        return next!;
    }
}
