using FluentAssertions;
using Roll6.Console.Claude;
using Roll6.Console.Codex;
using Roll6.Console.Settings;

namespace Roll6.Tests.Console;

/// <summary>The Codex engine of the console (095): arguments, the PATH lookup and the JSONL of codex exec.</summary>
public sealed class CodexTests
{
    // Shapes taken from the codex-cli 0.161.0 probe (research T001), paths shortened.
    private const string SAMPLE = """
        {"type":"thread.started","thread_id":"01a1525c-287c-7241-82a1-6fca5b99a154"}
        {"type":"turn.started"}
        {"type":"item.started","item":{"id":"item_0","type":"command_execution","command":"pwsh -Command \"Copy-Item -LiteralPath 'C:\\Users\\x\\.codex\\generated_images\\a.png' -Destination 'mapas-gerados\\abc\\versao-1.png'\"","status":"in_progress"}}
        {"type":"item.completed","item":{"id":"item_0","type":"command_execution","command":"pwsh","exit_code":0,"status":"completed"}}
        {"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Mapa gerado em vista de cima."}}
        {"type":"turn.completed","usage":{"input_tokens":10,"output_tokens":5}}
        not json
        """;

    private static readonly ConsoleSettings SETTINGS = new() { ClaudeWorkingDirectory = @"C:\mesa", CodexExecutable = "codex" };

    [Fact]
    public void ANewRunUsesTheWorkspaceSandboxTheFolderTheImagesAndStdin()
    {
        var arguments = CodexRunner.Arguments(SETTINGS, null, new[] { @"C:\mesa\a.png", @"C:\mesa\b.png" });

        arguments.Should().Equal("exec", "-s", "workspace-write", "-C", @"C:\mesa", "--skip-git-repo-check", "--json",
            "-i", @"C:\mesa\a.png", "-i", @"C:\mesa\b.png", "-");
    }

    [Fact]
    public void AResumedRunPutsTheExecOptionsBeforeResume()
    {
        var arguments = CodexRunner.Arguments(SETTINGS, "01a1525c-287c-7241-82a1-6fca5b99a154", Array.Empty<string>());

        arguments.IndexOf("resume").Should().BeGreaterThan(arguments.IndexOf("-C"), "resume does not accept -s/-C (0.161.0)");
        arguments.Should().ContainInOrder("resume", "01a1525c-287c-7241-82a1-6fca5b99a154", "--json", "-");
    }

    [Fact]
    public void TheNameIsFoundInThePathAsCmdOnWindows()
    {
        if (!OperatingSystem.IsWindows())
            return;
        var resolved = CodexRunner.Resolve("codex", name => name == "PATH" ? @"C:\nada;C:\npm" : null,
            path => path.Equals(@"C:\npm\codex.cmd", StringComparison.OrdinalIgnoreCase));

        resolved.Should().Be(@"C:\npm\codex.cmd");
        CodexRunner.Resolve(@"C:\tools\codex.exe").Should().Be(@"C:\tools\codex.exe");
    }

    [Fact]
    public void TheJsonlBecomesTheSameEventsAsTheClaudes()
    {
        var events = SAMPLE.Split('\n').SelectMany(CodexEventReader.ReadLine).ToList();

        events.OfType<CodexStarted>().Single().ThreadId.Should().Be("01a1525c-287c-7241-82a1-6fca5b99a154");
        events.OfType<ClaudeToolUse>().Single().Tool.Should().Be("Shell");
        events.OfType<ClaudeTextDelta>().Single().Text.Should().Be("Mapa gerado em vista de cima.\n\n");
        events.OfType<ClaudeFinished>().Single().IsError.Should().BeFalse();
    }

    [Fact]
    public void AFailedTurnCarriesItsMessage()
    {
        var events = CodexEventReader.ReadLine("""{"type":"turn.failed","error":{"message":"quota exceeded"}}""").ToList();

        events.OfType<ClaudeFinished>().Single().Should().BeEquivalentTo(new ClaudeFinished(true, "quota exceeded", Array.Empty<string>()));
        CodexEventReader.ReadLine("""{"type":"error","message":"falhou"}""").OfType<ClaudeFinished>().Single().Result.Should().Be("falhou");
    }
}
