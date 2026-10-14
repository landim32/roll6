using FluentAssertions;
using Roll6Anime.Core.Claude;
using Roll6Anime.Core.Settings;

namespace Roll6Anime.Tests;

/// <summary>The screen's context and the CLI's arguments (062, FR-011, contracts/claude-cli.md).</summary>
public class PromptContextTests
{
    private static readonly AnimeSettings SETTINGS = new()
    {
        AnimationsFolder = @"C:\repos\gurps-adventure\animacoes",
        ClaudeWorkingDirectory = @"C:\repos\gurps-adventure",
        ClaudeAllowedTools = "Bash(python:*)",
    };

    [Fact]
    public void NamesTheOpenAnimationAsTheClaudeSeesIt()
    {
        var text = PromptContext.Build(SETTINGS, @"C:\repos\gurps-adventure\animacoes\aceno-duplo.json", @"C:\modelos\orc.glb");

        text.Should().Contain("skill criar-animacao");
        text.Should().Contain("Animação aberta: animacoes/aceno-duplo.json — altere este mesmo arquivo");
        text.Should().Contain(@"Modelo aberto na tela: C:\modelos\orc.glb");
        text.Should().Contain("Não envie a animação ao Roll6");
        text.Should().Contain("No Bash, rode só comandos python simples");
    }

    [Fact]
    public void AFileOutsideTheWorkingDirectoryKeepsItsFullPath()
    {
        PromptContext.Build(SETTINGS, @"D:\outras\x.json", null).Should().Contain(@"Animação aberta: D:\outras\x.json");
    }

    [Fact]
    public void WithoutAnAnimationItAsksForANewFile()
    {
        var text = PromptContext.Build(SETTINGS, null, null);

        text.Should().Contain("Nenhuma animação aberta — crie um arquivo novo em animacoes/");
        text.Should().NotContain("Modelo aberto");
    }

    [Fact]
    public void TheFirstRequestCreatesTheSessionAndTheNextOnesResumeIt()
    {
        var conversation = new Conversation();

        var first = PromptContext.ClaudeArguments(SETTINGS, conversation, "contexto");

        first.Should().ContainInOrder("-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages");
        first.Should().ContainInOrder("--session-id", conversation.SessionId.ToString());
        first.Should().ContainInOrder("--permission-mode", "acceptEdits");
        first.Should().ContainInOrder("--allowedTools", "Bash(python:*)");
        first.Should().ContainInOrder("--append-system-prompt", "contexto");
        first.Should().NotContain("--resume");

        conversation.Started = true;
        var next = PromptContext.ClaudeArguments(SETTINGS, conversation, "contexto");

        next.Should().ContainInOrder("--resume", conversation.SessionId.ToString());
        next.Should().NotContain("--session-id");
    }
}
