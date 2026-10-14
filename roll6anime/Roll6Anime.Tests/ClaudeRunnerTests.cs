using FluentAssertions;
using Roll6Anime.Core.Claude;
using Roll6Anime.Core.Settings;

namespace Roll6Anime.Tests;

/// <summary>Running a request without the real Claude: a missing CLI, a missing folder, a fake CLI (062, FR-014).</summary>
public sealed class ClaudeRunnerTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "roll6anime-tests", Guid.NewGuid().ToString("N"));

    public ClaudeRunnerTests() => Directory.CreateDirectory(_folder);

    public void Dispose() => Directory.Delete(_folder, true);

    [Fact]
    public async Task AMissingCliSaysSo()
    {
        var settings = new AnimeSettings { ClaudeWorkingDirectory = _folder, ClaudeExecutable = Path.Combine(_folder, "nao-existe.exe") };

        var outcome = await Run(settings, new Conversation(), new List<ClaudeEvent>());

        outcome.Kind.Should().Be(ClaudeOutcomeKind.Failed);
        outcome.Message.Should().Be(ClaudeRunner.NOT_FOUND);
    }

    [Fact]
    public async Task AMissingWorkingDirectorySaysWhich()
    {
        var missing = Path.Combine(_folder, "nada");
        var settings = new AnimeSettings { ClaudeWorkingDirectory = missing };

        var outcome = await Run(settings, new Conversation(), new List<ClaudeEvent>());

        outcome.Kind.Should().Be(ClaudeOutcomeKind.Failed);
        outcome.Message.Should().Contain(missing);
    }

    [Fact]
    [Trait("OS", "Windows")]
    public async Task AFakeCliThatAnswersOkIsDoneAndStartsTheConversation()
    {
        var sample = Path.Combine(AppContext.BaseDirectory, "Samples", "claude-ok.jsonl");
        var fake = Path.Combine(_folder, "fake-claude.cmd");
        File.WriteAllText(fake, $"@echo off\r\ntype \"{sample}\"\r\n");
        var settings = new AnimeSettings { ClaudeWorkingDirectory = _folder, ClaudeExecutable = fake };
        var conversation = new Conversation();
        var events = new List<ClaudeEvent>();

        var outcome = await Run(settings, conversation, events);

        outcome.Kind.Should().Be(ClaudeOutcomeKind.Done, outcome.Message);
        events.Select(item => item.GetType().Name).Should().Equal(nameof(ClaudeStarted), nameof(ClaudeTextDelta), nameof(ClaudeFinished));
        conversation.Started.Should().BeTrue();
    }

    [Fact]
    [Trait("OS", "Windows")]
    public async Task ALoginErrorIsExplained()
    {
        var fake = Path.Combine(_folder, "fake-claude.cmd");
        File.WriteAllText(fake, "@echo off\r\necho {\"type\":\"result\",\"is_error\":true,\"result\":\"Invalid API key · Please run /login\"}\r\n");
        var settings = new AnimeSettings { ClaudeWorkingDirectory = _folder, ClaudeExecutable = fake };

        var outcome = await Run(settings, new Conversation(), new List<ClaudeEvent>());

        outcome.Kind.Should().Be(ClaudeOutcomeKind.Failed);
        outcome.Message.Should().Be(ClaudeRunner.NOT_LOGGED_IN);
    }

    private static Task<ClaudeOutcome> Run(AnimeSettings settings, Conversation conversation, List<ClaudeEvent> events) =>
        ClaudeRunner.RunAsync(settings, conversation, "contexto", "pedido", Array.Empty<PromptImage>(), new SyncProgress(events), CancellationToken.None);

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
