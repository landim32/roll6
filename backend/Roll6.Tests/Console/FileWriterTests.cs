using FluentAssertions;
using Roll6.Console.Files;

namespace Roll6.Tests.Console;

/// <summary>The console writes only inside its working directory, and only what changed (086).</summary>
public sealed class FileWriterTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "roll6-console-tests", Guid.NewGuid().ToString("N"));

    public FileWriterTests() => Directory.CreateDirectory(_root);

    public void Dispose() => Directory.Delete(_root, true);

    [Fact]
    public void ResolvesInsideTheWorkingDirectoryOnly()
    {
        FileWriter.Resolve(_root, "animacoes/a.json").Should().Be(Path.Combine(_root, "animacoes", "a.json"));
        FileWriter.Resolve(_root, "animacoes\\a.json").Should().Be(Path.Combine(_root, "animacoes", "a.json"));
        FileWriter.Resolve(_root, "../fora.json").Should().BeNull();
        FileWriter.Resolve(_root, "animacoes/../../fora.json").Should().BeNull();
        FileWriter.Resolve(_root, @"C:\Windows\x.json").Should().BeNull();
        FileWriter.Resolve(_root, "").Should().BeNull();
    }

    [Fact]
    public void WritesCreatingTheFolderAndSkipsAnUnchangedFile()
    {
        FileWriter.Write(_root, "animacoes/a.json", "{\"a\":1}\n").Should().BeTrue();
        File.ReadAllText(Path.Combine(_root, "animacoes", "a.json")).Should().Be("{\"a\":1}\n");
        File.ReadAllBytes(Path.Combine(_root, "animacoes", "a.json"))[0].Should().Be((byte)'{', "no BOM");

        FileWriter.Write(_root, "animacoes/a.json", "{\"a\":1}\n").Should().BeFalse();
        FileWriter.Write(_root, "animacoes/a.json", "{\"a\":2}\n").Should().BeTrue();
        Directory.GetFiles(Path.Combine(_root, "animacoes")).Should().HaveCount(1, "no temporary file is left");
    }

    [Fact]
    public void RefusesAPathOutside()
    {
        var act = () => FileWriter.Write(_root, "../x.json", "{}");

        act.Should().Throw<InvalidOperationException>().WithMessage(FileWriter.OUTSIDE);
    }

    [Fact]
    public void RelativeUsesForwardSlashes()
    {
        FileWriter.Relative(_root, Path.Combine(_root, "animacoes", "a.json")).Should().Be("animacoes/a.json");
    }
}
