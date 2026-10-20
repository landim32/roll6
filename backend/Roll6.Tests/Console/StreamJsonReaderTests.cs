using FluentAssertions;
using Roll6.Console.Claude;

namespace Roll6.Tests.Console;

/// <summary>The Claude Code stream-json output becomes the events the console relays (086; from 062, contracts/claude-cli.md).</summary>
public class StreamJsonReaderTests
{
    private static readonly string SAMPLE = Path.Combine(AppContext.BaseDirectory, "Samples", "claude-ok.jsonl");

    [Fact]
    public void ReadsTheRealOutputOfAShortAnswer()
    {
        // 097: the whole texts and the tools' results are for the log; the relayed events are the same as before.
        var events = File.ReadAllLines(SAMPLE).SelectMany(StreamJsonReader.ReadLine).Where(e => e is not ClaudeText and not ClaudeToolResult).ToList();

        events.Should().HaveCount(3);
        events[0].Should().Be(new ClaudeStarted(Guid.Parse("11111111-2222-4333-8444-555555555555"), true));
        events[1].Should().Be(new ClaudeTextDelta("ok"));
        var finished = events[2].Should().BeOfType<ClaudeFinished>().Subject;
        finished.IsError.Should().BeFalse();
        finished.Result.Should().Be("ok");
        finished.PermissionDenials.Should().BeEmpty();
    }

    [Fact]
    public void ToolsOfAnAssistantMessageBecomeToolUses()
    {
        const string line = """
            {"type":"assistant","message":{"content":[{"type":"text","text":"Vou editar."},{"type":"tool_use","name":"Edit","input":{"file_path":"animacoes/a.json"}},{"type":"tool_use","name":"Bash","input":{"command":"python validar.py a.json"}}]}}
            """;

        var events = StreamJsonReader.ReadLine(line);

        events.Should().Equal(new ClaudeText("Vou editar."),
            new ClaudeToolUse("Edit", "animacoes/a.json", """{"file_path":"animacoes/a.json"}"""),
            new ClaudeToolUse("Bash", "python validar.py a.json", """{"command":"python validar.py a.json"}"""));
        ((ClaudeToolUse)events[1]).Describe().Should().Be("Editando animacoes/a.json");
        ((ClaudeToolUse)events[2]).Describe().Should().Be("Executando python validar.py a.json");
    }

    [Fact]
    public void TheToolsResultsComeBackAsUserMessages_ForTheLogOnly()
    {
        const string text = """
            {"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"t1","content":"Campanha 3 · turno 16\n\nSÓ MCP"}]}}
            """;
        const string array = """
            {"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"t2","is_error":true,"content":[{"type":"text","text":"Traceback"},{"type":"text","text":"boom"}]}]}}
            """;

        StreamJsonReader.ReadLine(text).Should().Equal(new ClaudeToolResult("t1", "Campanha 3 · turno 16 SÓ MCP", false));
        StreamJsonReader.ReadLine(array).Should().Equal(new ClaudeToolResult("t2", "Traceback boom", true));
        StreamJsonReader.ReadLine("""{"type":"user","message":{"content":[{"type":"text","text":"oi"}]}}""").Should().BeEmpty();
    }

    [Fact]
    public void AFailedResultCarriesItsTextAndTheDeniedTools()
    {
        const string line = """{"type":"result","subtype":"error_during_execution","is_error":true,"result":"Falhou","permission_denials":[{"tool_name":"Bash","tool_use_id":"x"}]}""";

        var finished = StreamJsonReader.ReadLine(line).Single().Should().BeOfType<ClaudeFinished>().Subject;

        finished.IsError.Should().BeTrue();
        finished.Result.Should().Be("Falhou");
        finished.PermissionDenials.Should().Equal("Bash");
    }

    [Fact]
    public void AnApiKeySessionIsNotTheAccount()
    {
        const string line = """{"type":"system","subtype":"init","session_id":"11111111-2222-4333-8444-555555555555","apiKeySource":"ANTHROPIC_API_KEY"}""";

        StreamJsonReader.ReadLine(line).Single().Should().Be(new ClaudeStarted(Guid.Parse("11111111-2222-4333-8444-555555555555"), false));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("{ broken")]
    [InlineData("""{"type":"rate_limit_event"}""")]
    [InlineData("""{"type":"stream_event","event":{"type":"message_start"}}""")]
    [InlineData("""{"type":"system","subtype":"status"}""")]
    public void IgnoresWhatItDoesNotUse(string line)
    {
        StreamJsonReader.ReadLine(line).Should().BeEmpty();
    }
}
