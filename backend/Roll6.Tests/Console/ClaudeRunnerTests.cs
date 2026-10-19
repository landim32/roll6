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
    public void ARunWithToolsGetsTheLocalServerAndPreApprovesEachTool()
    {
        var settings = new ConsoleSettings { ClaudeAllowedTools = "Bash(python:*)" };
        var tools = new FakeHost("http://127.0.0.1:5123/mcp", "segredo", "print_stage");

        var arguments = ClaudeRunner.Arguments(settings, Guid.NewGuid(), started: false, "contexto", tools: tools);

        arguments.Should().ContainInOrder("--allowedTools", "Bash(python:*),mcp__roll6-editor__print_stage");
        var config = arguments[arguments.IndexOf("--mcp-config") + 1];
        using var json = System.Text.Json.JsonDocument.Parse(config);
        var server = json.RootElement.GetProperty("mcpServers").GetProperty("roll6-editor");
        server.GetProperty("type").GetString().Should().Be("http");
        server.GetProperty("url").GetString().Should().Be("http://127.0.0.1:5123/mcp");
        server.GetProperty("headers").GetProperty("Authorization").GetString().Should().Be("Bearer segredo");
    }

    [Fact]
    public void ToolsNeverReachAReadOnlyRunNorARunWithoutTools()
    {
        var settings = new ConsoleSettings { ClaudeAllowedTools = "Bash(python:*)" };
        var tools = new FakeHost("http://127.0.0.1:5123/mcp", "segredo", "print_stage");

        var readOnly = ClaudeRunner.Arguments(settings, Guid.NewGuid(), started: false, "contexto", readOnly: true, tools: tools);
        var plain = ClaudeRunner.Arguments(settings, Guid.NewGuid(), started: false, "contexto");

        readOnly.Should().NotContain(a => a.Contains("roll6-editor") || a.Contains("segredo"));
        plain.Should().NotContain("--mcp-config");
        plain.Should().ContainInOrder("--allowedTools", "Bash(python:*)");
    }

    private sealed class FakeHost : Roll6.Console.Tools.IToolHost
    {
        public FakeHost(string url, string token, params string[] names)
        {
            Url = url;
            Token = token;
            ToolNames = names;
        }

        public string Url { get; }
        public string Token { get; }
        public IReadOnlyList<string> ToolNames { get; }
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    [Fact]
    public void AReadOnlyRunCanOnlyReadInsideTheFolder()
    {
        var settings = new ConsoleSettings { ClaudeAllowedTools = "Bash(python:*)" };
        var session = Guid.NewGuid();

        var arguments = ClaudeRunner.Arguments(settings, session, started: true, "regras", readOnly: true);

        arguments.Should().ContainInOrder("--session-id", session.ToString());
        arguments.Should().Contain("--no-session-persistence");
        arguments.Should().NotContain("--resume");
        arguments.Should().ContainInOrder("--tools", "Read,Glob,Grep,Skill");
        // Reading is not pre-approved: outside the working directory it would need a permission "dontAsk" denies.
        arguments.Should().ContainInOrder("--allowedTools", "Skill");
        arguments.Should().NotContain("Bash(python:*)");
        arguments.Should().ContainInOrder("--disallowedTools", "Bash,Write,Edit,MultiEdit,NotebookEdit,WebFetch,WebSearch,Task,TodoWrite");
        arguments.Should().ContainInOrder("--permission-mode", "dontAsk");
        arguments.Should().NotContain("acceptEdits");
        arguments.Should().ContainInOrder("--permission-prompts", "none");
        arguments.Should().ContainInOrder("--strict-mcp-config", "--mcp-config", "{\"mcpServers\":{}}");
        arguments.Should().ContainInOrder("--append-system-prompt", "regras");
    }

    [Fact]
    public void TheConsoleCredentialsNeverReachTheClaude()
    {
        ClaudeRunner.REMOVED_VARIABLES.Should().Contain(new[] { "ROLL6_API_KEY", "ROLL6_URL", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN" });
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
