using FluentAssertions;
using Roll6.Console.Bridge;
using Roll6.Console.Claude;
using Roll6.Console.Codex;
using Roll6.Console.Settings;
using Roll6.Console.Tools;
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
    public async Task ACodexRunAttachesThePicturesResumesTheThreadAndReportsImagesAsBase64()
    {
        var png = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 9 };
        var request = new RunInfo
        {
            RequestId = 31,
            Engine = RunInfo.ENGINE_CODEX,
            Resume = "01a1525c-287c-7241-82a1-6fca5b99a154",
            Prompt = "<instrucoes_do_roll6>…",
            Images = new List<PromptImageInfo> { new() { Png = Convert.ToBase64String(png), Caption = "marcado" } },
            Files = new List<FileWriteInfo> { new() { Path = "mapas-gerados/abc/entrada/base.png", Content = Convert.ToBase64String(png), Encoding = FileEncodings.BASE64 } },
            Watch = new List<string> { "mapas-gerados/abc/" },
        };
        IReadOnlyList<string>? seen = null;
        string? stdin = null;
        var codex = new FakeClaude((arguments, input, progress) =>
        {
            seen = arguments;
            stdin = input;
            progress.Report(new CodexStarted("01a1525c-287c-7241-82a1-6fca5b99a154"));
            File.WriteAllBytes(Path.Combine(_root, "mapas-gerados", "abc", "versao-1.png"), png);
            return new ClaudeOutcome(ClaudeOutcomeKind.Done);
        });
        var claude = new FakeClaude((_, _, _) => throw new InvalidOperationException("the Claude must not run"));
        var runner = new RequestRunner(_settings, claude, _reporter, codex: codex);

        await runner.RunAsync(request, afterRun: TimeSpan.FromMilliseconds(600));

        File.ReadAllBytes(Path.Combine(_root, "mapas-gerados", "abc", "entrada", "base.png")).Should().Equal(png);
        File.ReadAllBytes(Path.Combine(_root, ".roll6", "anexos", "31", "1.png")).Should().Equal(png);
        seen.Should().ContainInOrder("resume", "01a1525c-287c-7241-82a1-6fca5b99a154");
        seen!.Count(a => a == "-i").Should().Be(2);
        stdin.Should().Be("<instrucoes_do_roll6>…");
        _reporter.Events.Single(e => e.Kind == "started").Text.Should().Be("01a1525c-287c-7241-82a1-6fca5b99a154");
        var image = _reporter.Changes.Single(c => c.Path == "mapas-gerados/abc/versao-1.png");
        image.Encoding.Should().Be("base64");
        Convert.FromBase64String(image.Content).Should().Equal(png);
        _reporter.Changes.Should().NotContain(c => c.Path.Contains("entrada"), "the console's own writes are not reported back");
        _reporter.Outcome!.Kind.Should().Be("done");
    }

    [Fact]
    public async Task ARunWithToolsGivesTheClaudeTheServerAndReportsTheEditBeforeEachCall()
    {
        var hosts = new FakeToolHosts();
        var request = Request();
        request.Tools = new List<ToolInfo> { new() { Name = "print_stage", Description = "prints" } };
        List<FileChangedInfo>? changesAtCall = null;
        _reporter.ToolResult = call =>
        {
            lock (_reporter.Changes) changesAtCall = _reporter.Changes.ToList();
            return new ToolResultInfo { CallId = call.CallId, Text = "Print 1: frente" };
        };
        IReadOnlyList<string>? seen = null;
        var claude = new FakeClaude(async (arguments, _, _, ct) =>
        {
            seen = arguments;
            // The Claude edits the file and asks for a print right away, before the watcher settles.
            File.WriteAllText(Path.Combine(_root, "animacoes", "7-aceno.json"), "{\"v\":2}\n");
            var result = await hosts.Invoke!(new ToolCallInfo { CallId = "c1", Name = "print_stage" }, ct);
            result.Text.Should().Be("Print 1: frente");
            return new ClaudeOutcome(ClaudeOutcomeKind.Done);
        });
        var runner = new RequestRunner(_settings, claude, _reporter, toolHosts: hosts);

        await runner.RunAsync(request, afterRun: TimeSpan.Zero);

        hosts.Started.Should().Be(1);
        hosts.Host!.Disposed.Should().BeTrue("the server lives only while the run lasts");
        seen.Should().Contain("--mcp-config");
        seen![seen.ToList().IndexOf("--allowedTools") + 1].Should().EndWith("mcp__roll6-editor__print_stage");
        changesAtCall.Should().ContainSingle(c => c.Path == "animacoes/7-aceno.json" && c.Content == "{\"v\":2}\n");
        _reporter.ToolCalls.Should().ContainSingle().Which.Name.Should().Be("print_stage");
    }

    [Fact]
    public async Task AReadOnlyRunNeverStartsTheToolServer()
    {
        var hosts = new FakeToolHosts();
        var request = Request();
        request.ReadOnly = true;
        request.Tools = new List<ToolInfo> { new() { Name = "print_stage" } };
        IReadOnlyList<string>? seen = null;
        var runner = new RequestRunner(_settings, new FakeClaude((arguments, _, _) =>
        {
            seen = arguments;
            return new ClaudeOutcome(ClaudeOutcomeKind.Done);
        }), _reporter, toolHosts: hosts);

        await runner.RunAsync(request, afterRun: TimeSpan.Zero);

        hosts.Started.Should().Be(0);
        seen.Should().NotContain(a => a.Contains("roll6-editor"));
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

        public List<ToolCallInfo> ToolCalls { get; } = new();
        public Func<ToolCallInfo, ToolResultInfo> ToolResult { get; set; } = call => new ToolResultInfo { CallId = call.CallId };

        public Task<ToolResultInfo> CallToolAsync(long requestId, ToolCallInfo call, CancellationToken cancellation)
        {
            lock (ToolCalls) ToolCalls.Add(call);
            return Task.FromResult(ToolResult(call));
        }
    }

    private sealed class FakeToolHosts : IToolHostFactory
    {
        public int Started { get; private set; }
        public ToolInvoker? Invoke { get; private set; }
        public FakeHost? Host { get; private set; }

        public Task<IToolHost> StartAsync(IReadOnlyList<ToolInfo> tools, ToolInvoker invoke, CancellationToken cancellation)
        {
            Started++;
            Invoke = invoke;
            Host = new FakeHost(tools.Select(t => t.Name).ToList());
            return Task.FromResult<IToolHost>(Host);
        }
    }

    private sealed class FakeHost : IToolHost
    {
        public FakeHost(IReadOnlyList<string> names) => ToolNames = names;
        public string Url => "http://127.0.0.1:5555/mcp";
        public string Token => "t";
        public IReadOnlyList<string> ToolNames { get; }
        public bool Disposed { get; private set; }

        public ValueTask DisposeAsync()
        {
            Disposed = true;
            return ValueTask.CompletedTask;
        }
    }
}
