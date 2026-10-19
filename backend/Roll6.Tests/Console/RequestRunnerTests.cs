using FluentAssertions;
using Roll6.Console.Bridge;
using Roll6.Console.Claude;
using Roll6.Console.Settings;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Tests.Console;

/// <summary>One request through the console, with a fake Claude: files written before, changes reported, stop (086).</summary>
public sealed class RequestRunnerTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "roll6-console-tests", Guid.NewGuid().ToString("N"));
    private readonly ConsoleSettings _settings;
    private readonly FakeReporter _reporter = new();

    public RequestRunnerTests()
    {
        Directory.CreateDirectory(_root);
        _settings = new ConsoleSettings { ClaudeWorkingDirectory = _root };
    }

    public void Dispose() => Directory.Delete(_root, true);

    private static RunInfo Request(string path = "animacoes/7-aceno.json") => new()
    {
        RequestId = 12,
        SessionId = Guid.NewGuid(),
        SystemPrompt = "contexto",
        Prompt = "levante o braço",
        Files = new List<FileWriteInfo> { new() { Path = path, Content = "{\"v\":1}\n" } },
        Watch = new List<string> { "animacoes/" },
    };

    [Fact]
    public async Task WritesTheFilesBeforeTheRunAndReportsWhatTheClaudeChanged()
    {
        var claude = new FakeClaude((arguments, stdin, progress) =>
        {
            File.ReadAllText(Path.Combine(_root, "animacoes", "7-aceno.json")).Should().Be("{\"v\":1}\n", "written before the run");
            arguments.Should().ContainInOrder("--append-system-prompt", "contexto");
            stdin.Should().Contain("levante o braço");
            progress.Report(new ClaudeStarted(Guid.NewGuid(), true));
            progress.Report(new ClaudeTextDelta("Pronto."));
            progress.Report(new ClaudeToolUse("Edit", "animacoes/7-aceno.json"));
            // The Claude rewrites the working file and creates another one.
            File.WriteAllText(Path.Combine(_root, "animacoes", "7-aceno.json"), "{\"v\":2}\n");
            File.WriteAllText(Path.Combine(_root, "animacoes", "novo.json"), "{}");
            return new ClaudeOutcome(ClaudeOutcomeKind.Done);
        });
        var runner = new RequestRunner(_settings, claude, _reporter);

        await runner.RunAsync(Request(), afterRun: TimeSpan.FromMilliseconds(600));

        _reporter.Events.Select(e => e.Kind).Should().Equal("started", "text", "tool");
        _reporter.Changes.Select(c => c.Path).Should().BeEquivalentTo("animacoes/7-aceno.json", "animacoes/novo.json");
        _reporter.Changes.Single(c => c.Path == "animacoes/7-aceno.json").Content.Should().Be("{\"v\":2}\n");
        _reporter.Outcome!.Kind.Should().Be("done");
        runner.Running.Should().BeNull();
    }

    [Fact]
    public async Task AReadOnlyRunWritesAndWatchesNothing()
    {
        var claude = new FakeClaude((arguments, stdin, progress) =>
        {
            File.Exists(Path.Combine(_root, "animacoes", "7-aceno.json")).Should().BeFalse("a read-only run writes nothing");
            arguments.Should().ContainInOrder("--permission-mode", "dontAsk");
            File.WriteAllText(Path.Combine(_root, "animacoes-novo.json"), "{}");
            progress.Report(new ClaudeTextDelta("Resposta."));
            return new ClaudeOutcome(ClaudeOutcomeKind.Done);
        });
        var runner = new RequestRunner(_settings, claude, _reporter);
        var run = Request();
        run.ReadOnly = true;

        await runner.RunAsync(run, afterRun: TimeSpan.FromMilliseconds(300));

        _reporter.Changes.Should().BeEmpty();
        _reporter.Outcome!.Kind.Should().Be("done");
    }

    [Fact]
    public async Task APathOutsideTheWorkingDirectoryFailsTheRequest()
    {
        var runner = new RequestRunner(_settings, new FakeClaude((_, _, _) => throw new InvalidOperationException("must not run")), _reporter);

        await runner.RunAsync(Request("../fora.json"), afterRun: TimeSpan.Zero);

        _reporter.Outcome!.Kind.Should().Be("failed");
        _reporter.Outcome.Message.Should().Be("caminho fora da pasta de trabalho");
    }

    [Fact]
    public async Task StopKillsTheRunningRequest()
    {
        var started = new TaskCompletionSource();
        var claude = new FakeClaude(async (_, _, _, cancellation) =>
        {
            started.SetResult();
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(10), cancellation);
            }
            catch (OperationCanceledException)
            {
                return ClaudeOutcome.STOPPED;
            }
            return new ClaudeOutcome(ClaudeOutcomeKind.Done);
        });
        var runner = new RequestRunner(_settings, claude, _reporter);

        var run = runner.RunAsync(Request(), afterRun: TimeSpan.Zero);
        await started.Task;
        runner.Running.Should().Be(12);
        runner.Stop(12);
        await run;

        _reporter.Outcome!.Kind.Should().Be("stopped");
    }

    [Fact]
    public async Task ASecondRequestWhileOneRunsIsRefused()
    {
        var release = new TaskCompletionSource();
        var claude = new FakeClaude(async (_, _, _, _) =>
        {
            await release.Task;
            return new ClaudeOutcome(ClaudeOutcomeKind.Done);
        });
        var runner = new RequestRunner(_settings, claude, _reporter);

        var first = runner.RunAsync(Request(), afterRun: TimeSpan.Zero);
        await Task.Delay(100);
        var second = Request();
        second.RequestId = 13;
        await runner.RunAsync(second, afterRun: TimeSpan.Zero);
        release.SetResult();
        await first;

        _reporter.Outcomes.Should().ContainKey(13).WhoseValue.Message.Should().Be(RequestRunner.BUSY);
        _reporter.Outcomes[12].Kind.Should().Be("done");
    }

    [Fact]
    public void PermissionDenialsBecomeANotice()
    {
        var info = RequestRunner.ToInfo(new ClaudeFinished(false, "ok", new[] { "Bash" }));

        info!.Kind.Should().Be("notice");
        info.Text.Should().Be("Ferramentas sem permissão: Bash.");
        RequestRunner.ToInfo(new ClaudeFinished(false, "ok", Array.Empty<string>())).Should().BeNull();
    }

    private sealed class FakeClaude : IClaudeProcess
    {
        private readonly Func<IReadOnlyList<string>, string, IProgress<ClaudeEvent>, CancellationToken, Task<ClaudeOutcome>> _run;

        public FakeClaude(Func<IReadOnlyList<string>, string, IProgress<ClaudeEvent>, ClaudeOutcome> run)
            : this((arguments, stdin, progress, _) => Task.FromResult(run(arguments, stdin, progress))) { }

        public FakeClaude(Func<IReadOnlyList<string>, string, IProgress<ClaudeEvent>, CancellationToken, Task<ClaudeOutcome>> run) => _run = run;

        public Task<ClaudeOutcome> RunAsync(IReadOnlyList<string> arguments, string stdin, IProgress<ClaudeEvent> progress, CancellationToken cancellation) =>
            _run(arguments, stdin, progress, cancellation);
    }

    private sealed class FakeReporter : IRequestReporter
    {
        public List<ClaudeEventInfo> Events { get; } = new();
        public List<FileChangedInfo> Changes { get; } = new();
        public Dictionary<long, RequestOutcomeInfo> Outcomes { get; } = new();
        public RequestOutcomeInfo? Outcome => Outcomes.Values.LastOrDefault();

        public Task ProgressAsync(long requestId, ClaudeEventInfo claudeEvent)
        {
            lock (Events) Events.Add(claudeEvent);
            return Task.CompletedTask;
        }

        public Task FileChangedAsync(long requestId, FileChangedInfo info)
        {
            lock (Changes) Changes.Add(info);
            return Task.CompletedTask;
        }

        public Task FinishedAsync(long requestId, RequestOutcomeInfo outcome)
        {
            lock (Outcomes) Outcomes[requestId] = outcome;
            return Task.CompletedTask;
        }
    }
}
