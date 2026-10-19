using System.Collections.Concurrent;
using FluentAssertions;
using Roll6.Console.Files;

namespace Roll6.Tests.Console;

/// <summary>The watched paths are followed in real time, each file read whole once it stops changing (086; from 062).</summary>
public sealed class FileWatcherTests : IDisposable
{
    private static readonly TimeSpan WAIT = TimeSpan.FromSeconds(3);
    private readonly string _root = Path.Combine(Path.GetTempPath(), "roll6-console-tests", Guid.NewGuid().ToString("N"));
    private readonly FileWatcher _watcher;
    private readonly BlockingCollection<(string Path, string Content)> _events = new();

    public FileWatcherTests()
    {
        Directory.CreateDirectory(_root);
        _watcher = new FileWatcher(_root, new[] { "animacoes/", "outro/fixo.json" }) { SettleDelay = TimeSpan.FromMilliseconds(100) };
        _watcher.FileSettled += (path, content) => _events.Add((path, content));
        _watcher.Start();
    }

    public void Dispose()
    {
        _watcher.Dispose();
        Directory.Delete(_root, true);
    }

    [Fact]
    public void QuickWritesToOneFileSettleOnceWithTheWholeText()
    {
        var path = Path.Combine(_root, "animacoes", "a.json");
        File.WriteAllText(path, "{");
        File.WriteAllText(path, "{\"a\":");
        File.WriteAllText(path, "{\"a\":1}");

        Next().Should().Be(("animacoes/a.json", "{\"a\":1}"));
        _events.TryTake(out var extra, TimeSpan.FromMilliseconds(400)).Should().BeFalse(extra.Path);
    }

    [Fact]
    public void AFileDeletedAndWrittenAgainIsAChange()
    {
        var path = Path.Combine(_root, "animacoes", "e.json");
        File.WriteAllText(path, "{}");
        Next().Path.Should().Be("animacoes/e.json");

        // How a tool rewrites a file: delete, then create.
        File.Delete(path);
        File.WriteAllText(path, "{\"a\":1}");

        Next().Should().Be(("animacoes/e.json", "{\"a\":1}"));
    }

    [Fact]
    public void ADeletedFileIsNotReported()
    {
        var path = Path.Combine(_root, "animacoes", "b.json");
        File.WriteAllText(path, "{}");
        Next().Path.Should().Be("animacoes/b.json");

        File.Delete(path);

        _events.TryTake(out var extra, TimeSpan.FromMilliseconds(500)).Should().BeFalse(extra.Path);
    }

    [Fact]
    public void OnlyTheNamedFileOfAFolderIsWatched()
    {
        File.WriteAllText(Path.Combine(_root, "outro", "solto.json"), "{}");
        File.WriteAllText(Path.Combine(_root, "outro", "fixo.json"), "{\"fixo\":true}");

        Next().Should().Be(("outro/fixo.json", "{\"fixo\":true}"));
        _events.TryTake(out var extra, TimeSpan.FromMilliseconds(400)).Should().BeFalse(extra.Path);
    }

    [Fact]
    public void AnImageIsReportedAsItsBytesInBase64()
    {
        var bytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3 };
        File.WriteAllBytes(Path.Combine(_root, "animacoes", "versao-1.png"), bytes);

        _events.TryTake(out var settled, WAIT).Should().BeTrue();
        settled.Path.Should().Be("animacoes/versao-1.png");
        Convert.FromBase64String(settled.Content).Should().Equal(bytes);
    }

    [Fact]
    public void AnImageOverTheLimitIsAnnouncedWithoutItsBytes()
    {
        var large = new List<(string, long)>();
        _watcher.FileTooLarge += (path, length) => { lock (large) large.Add((path, length)); };
        File.WriteAllBytes(Path.Combine(_root, "animacoes", "enorme.png"), new byte[FileWriter.MAX_BINARY_BYTES + 1]);

        _watcher.Flush();

        lock (large) large.Should().ContainSingle().Which.Item2.Should().Be(FileWriter.MAX_BINARY_BYTES + 1);
        _events.TryTake(out _, TimeSpan.FromMilliseconds(400)).Should().BeFalse();
    }

    [Fact]
    public void TheOwnWriteIsNotReportedBack()
    {
        var path = Path.Combine(_root, "animacoes", "own.json");
        _watcher.Ignore(path, "{\"own\":1}");
        FileWriter.Write(_root, "animacoes/own.json", "{\"own\":1}");

        _events.TryTake(out var extra, TimeSpan.FromMilliseconds(500)).Should().BeFalse(extra.Path);

        File.WriteAllText(path, "{\"own\":2}");
        Next().Should().Be(("animacoes/own.json", "{\"own\":2}"));
    }

    [Fact]
    public void TemporaryFilesAreIgnored()
    {
        File.WriteAllText(Path.Combine(_root, "animacoes", "x.json.tmp"), "{}");

        _events.TryTake(out var extra, TimeSpan.FromMilliseconds(500)).Should().BeFalse(extra.Path);
    }

    private (string Path, string Content) Next()
    {
        _events.TryTake(out var next, WAIT).Should().BeTrue("an event was expected");
        return next;
    }
}
