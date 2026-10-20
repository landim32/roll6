using System.Text.Json;
using FluentAssertions;
using Roll6.Console.Bridge;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Tests.Console;

/// <summary>The console's log lines (097): header, campaign line, prefix, compacted inputs, result heads, redaction.</summary>
public class LogLinesTests
{
    private static readonly RunCampaignInfo CAMPAIGN = new() { CampaignId = 3, Name = "Tormento Vil II", TurnNo = 15 };

    [Fact]
    public void TheCampaignLineNamesTheCampaignAndTheTurn()
    {
        LogLines.CampaignLine(CAMPAIGN).Should().Be("CAMPANHA DO PEDIDO: «Tormento Vil II» (campaignId 3), turno 15. Trabalhe só nela; ignore campanha/roll6.json.");
        LogLines.CampaignLine(new RunCampaignInfo { CampaignId = 3, Name = "Mesa" }).Should().Be("CAMPANHA DO PEDIDO: «Mesa» (campaignId 3). Trabalhe só nela; ignore campanha/roll6.json.");
    }

    [Fact]
    public void TheHeaderSaysWhatKindOfRequestItIs()
    {
        LogLines.Header(new RunInfo { RequestId = 42, Campaign = CAMPAIGN }).Should().Be("Pedido #42 (GM): campanha «Tormento Vil II» (campaignId 3), turno 15 · Claude, sessão nova");
        LogLines.Header(new RunInfo { RequestId = 7, ReadOnly = true, Campaign = new RunCampaignInfo { CampaignId = 3, Name = "Mesa" } })
            .Should().Be("Pedido #7 (pergunta, somente leitura): campanha «Mesa» (campaignId 3) · Claude, sessão nova");
        LogLines.Header(new RunInfo { RequestId = 8, Started = true }).Should().Be("Pedido #8 (editor) · Claude, sessão retomada");
        LogLines.Header(new RunInfo { RequestId = 9, Engine = RunInfo.ENGINE_CODEX, Resume = "t1" }).Should().Be("Pedido #9 (gerador) · Codex, sessão retomada");
    }

    [Fact]
    public void ThePrefixPutsTheRequestOnEveryLine()
    {
        LogLines.Prefix(42, "→ Bash").Should().Be("#42  → Bash");
        LogLines.Prefix(42, "Claude: linha 1\nlinha 2\r\nlinha 3\n").Should().Be("#42  Claude: linha 1\n     linha 2\n     linha 3");
        LogLines.Prefix(null, "Conectado.").Should().Be("Conectado.");
    }

    [Fact]
    public void AToolInputIsCompactedAndCut()
    {
        using var small = JsonDocument.Parse("""{"command":"python gm.py contexto --campanha 3","description":"x\ny"}""");
        LogLines.Compact(small.RootElement).Should().Be("""{"command":"python gm.py contexto --campanha 3","description":"x y"}""");

        using var big = JsonDocument.Parse($$"""{"file_path":"a.md","content":"{{new string('x', 2000)}}","n":1,"items":["{{new string('y', 500)}}"]}""");
        var compact = LogLines.Compact(big.RootElement);
        compact.Length.Should().BeLessOrEqualTo(LogLines.TOTAL);
        compact.Should().StartWith("{\"file_path\":\"a.md\",\"content\":\"" + new string('x', 399) + "…\"");
        compact.Should().Contain("\"n\":1");
    }

    [Fact]
    public void AResultHeadIsOneShortLine_AndTheKeyNeverShows()
    {
        LogLines.Head("Campanha 3\n\n  turno 16   · SÓ MCP").Should().Be("Campanha 3 turno 16 · SÓ MCP");
        LogLines.Head(new string('a', 700)).Length.Should().Be(LogLines.RESULT);
        LogLines.Redact("→ Bash {\"command\":\"ROLL6_API_KEY=r6_c11eTYsWwdwUGm2B_b3WG7oRYph25Waps4pYnm7bhsM python x\"}")
            .Should().Be("→ Bash {\"command\":\"ROLL6_API_KEY=r6_… python x\"}");
        LogLines.Redact("r6_short").Should().Be("r6_short");
    }
}
