using FluentAssertions;
using Roll6.Console.Claude;
using Roll6.Console.Settings;

namespace Roll6.Tests.Console;

/// <summary>Running a request without the real Claude: a missing CLI, a missing folder, a fake CLI (086; from 062).</summary>
public sealed class ClaudeRunnerTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "roll6-console-tests", Guid.NewGuid().ToString("N"));

    public ClaudeRunnerTests() => Directory.CreateDirectory(_folder);

    public void Dispose() => Directory.Delete(_folder, true);

    [Fact]
    public void TheFirstRequestCreatesTheSessionAndTheNextOnesResumeIt()
    {
        var settings = new ConsoleSettings { ClaudeAllowedTools = "Bash(python:*)" };
        var session = Guid.NewGuid();

        var first = ClaudeRunner.Arguments(settings, session, started: false, "contexto");

        first.Should().ContainInOrder("-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--include-partial-messages");
        first.Should().ContainInOrder("--session-id", session.ToString());
        first.Should().ContainInOrder("--permission-mode", "acceptEdits");
        first.Should().ContainInOrder("--allowedTools", "Bash(python:*)");
        first.Should().ContainInOrder("--append-system-prompt", "contexto");
        first.Should().NotContain("--resume");

        var next = ClaudeRunner.Arguments(settings, session, started: true, "contexto");

        next.Should().ContainInOrder("--resume", session.ToString());
        next.Should().NotContain("--session-id");
    }

    [Fact]
    public async Task AMissingCliSaysSo()
    {
        var settings = new ConsoleSettings { ClaudeWorkingDirectory = _folder, ClaudeExecutable = Path.Combine(_folder, "nao-existe.exe") };

        var outcome = await Run(settings, new List<ClaudeEvent>());

        outcome.Kind.Should().Be(ClaudeOutcomeKind.Failed);
        outcome.Message.Should().Be(ClaudeRunner.NOT_FOUND);
    }

    [Fact]
    public async Task AMissingWorkingDirectorySaysWhich()
    {
        var missing = Path.Combine(_folder, "nada");
        var settings = new ConsoleSettings { ClaudeWorkingDirectory = missing };

        var outcome = await Run(settings, new List<ClaudeEvent>());

        outcome.Kind.Should().Be(ClaudeOutcomeKind.Failed);
        outcome.Message.Should().Contain(missing);
    }

    [Fact]
    [Trait("OS", "Windows")]
    public async Task AFakeCliThatAnswersOkIsDone()
    {
        var sample = Path.Combine(AppContext.BaseDirectory, "Samples", "claude-ok.jsonl");
        var fake = Path.Combine(_folder, "fake-claude.cmd");
        File.WriteAllText(fake, $"@echo off\r\ntype \"{sample}\"\r\n");
        var settings = new ConsoleSettings { ClaudeWorkingDirectory = _folder, ClaudeExecutable = fake };
        var events = new List<ClaudeEvent>();

        var outcome = await Run(settings, events);

        outcome.Kind.Should().Be(ClaudeOutcomeKind.Done, outcome.Message);
        events.Select(item => item.GetType().Name).Should().Equal(nameof(ClaudeStarted), nameof(ClaudeTextDelta), nameof(ClaudeFinished));
        outcome.ToInfo().Kind.Should().Be("done");
    }

    [Fact]
    [Trait("OS", "Windows")]
    public async Task ALoginErrorIsExplained()
    {
        var fake = Path.Combine(_folder, "fake-claude.cmd");
        File.WriteAllText(fake, "@echo off\r\necho {\"type\":\"result\",\"is_error\":true,\"result\":\"Invalid API key · Please run /login\"}\r\n");
        var settings = new ConsoleSettings { ClaudeWorkingDirectory = _folder, ClaudeExecutable = fake };

        var outcome = await Run(settings, new List<ClaudeEvent>());

        outcome.Kind.Should().Be(ClaudeOutcomeKind.Failed);
        outcome.Message.Should().Be(ClaudeRunner.NOT_LOGGED_IN);
        outcome.ToInfo().Kind.Should().Be("failed");
    }

    private static Task<ClaudeOutcome> Run(ConsoleSettings settings, List<ClaudeEvent> events) =>
        new ClaudeRunner(settings).RunAsync(ClaudeRunner.Arguments(settings, Guid.NewGuid(), false, "contexto"), "{}\n", new SyncProgress(events), CancellationToken.None);

    /// <summary>Collects the events on the calling thread (Progress&lt;T&gt; would post them later).</summary>
    private sealed class SyncProgress : IProgress<ClaudeEvent>
    {
        private readonly List<ClaudeEvent> _events;

        public SyncProgress(List<ClaudeEvent> events) => _events = events;

        public void Report(ClaudeEvent value)
        {
            lock (_events)
                _events.Add(value);
        }
    }
}
