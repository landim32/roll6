using System.Text.Json;
using FluentAssertions;
using Roll6.Domain.Animations;
using Roll6.Domain.Models;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Tests.Animations;

/// <summary>What the server builds for the generic console on behalf of the animation editor (086).</summary>
public class AnimationRequestBuilderTests
{
    private static readonly Animation ACENO = new() { AnimationId = 7, Name = "Aceno Duplo — versão 2" };

    [Fact]
    public void TheWorkingFileIsNamedAfterTheAnimation()
    {
        AnimationRequestBuilder.WorkingPath(ACENO).Should().Be("animacoes/7-aceno-duplo-versao-2.json");
        AnimationRequestBuilder.WorkingPath(8, "   ").Should().Be("animacoes/8-animacao.json");
    }

    [Fact]
    public void BuildsTheRunWithTheFileTheWatchAndTheContext()
    {
        using var content = JsonDocument.Parse("""{"duration":1.5,"loop":true,"tracks":[]}""");
        var conversation = new AnimationConversation { ClaudeSessionId = Guid.Parse("11111111-2222-4333-8444-555555555555"), Started = true };
        var images = new[] { new PromptImageInfo { Png = "AAAA", Caption = "print" } };

        var run = AnimationRequestBuilder.Build(ACENO, content.RootElement, conversation, 12, "levante o braço", images, "Orc");

        run.RequestId.Should().Be(12);
        run.SessionId.Should().Be(conversation.ClaudeSessionId);
        run.Started.Should().BeTrue();
        run.Prompt.Should().Be("levante o braço");
        run.Images.Should().BeEquivalentTo(images);
        run.Watch.Should().Equal("animacoes/");
        run.Files.Should().ContainSingle().Which.Path.Should().Be("animacoes/7-aceno-duplo-versao-2.json");
        run.Files[0].Content.Should().Be("{\n  \"duration\": 1.5,\n  \"loop\": true,\n  \"tracks\": []\n}\n");
        run.SystemPrompt.Should().Contain("Animação aberta: animacoes/7-aceno-duplo-versao-2.json — altere este mesmo arquivo");
        run.SystemPrompt.Should().Contain("Modelo mostrado na tela: Orc");
    }

    [Fact]
    public void TheContextIsTheEditorInstructions()
    {
        var text = AnimationPromptContext.Build("animacoes/7-aceno.json", null);

        text.Should().Contain("editor de animações do Roll6");
        text.Should().Contain("skill criar-animacao");
        text.Should().NotContain("Modelo mostrado");
        text.Should().Contain("No Bash, rode só comandos python simples");
        text.Should().Contain("Formas vermelhas nos prints");
        text.Should().NotContain("roll6anime");
    }

    [Theory]
    [InlineData("animacoes/7-aceno-duplo-versao-2.json", FileChangeKind.Working)]
    [InlineData("animacoes\\7-Aceno-Duplo-Versao-2.json", FileChangeKind.Working)]
    [InlineData("./animacoes/7-aceno-duplo-versao-2.json", FileChangeKind.Working)]
    [InlineData("animacoes/novo.json", FileChangeKind.OtherAnimation)]
    [InlineData("animacoes/sub/x.json", FileChangeKind.Ignored)]
    [InlineData("animacoes/notas.txt", FileChangeKind.Ignored)]
    [InlineData("outra/7-aceno-duplo-versao-2.json", FileChangeKind.Ignored)]
    [InlineData("", FileChangeKind.Ignored)]
    [InlineData(null, FileChangeKind.Ignored)]
    public void ClassifiesTheReportedPaths(string? path, FileChangeKind expected)
    {
        AnimationRequestBuilder.Classify(ACENO, path).Should().Be(expected);
    }

    [Fact]
    public void TheContextNamesTheWeaponsOfTheModel()
    {
        var text = AnimationPromptContext.Build("animacoes/7-aceno.json", "Orc", new[] { "Machado (mão direita)", "Escudo (mão esquerda)" });
        var without = AnimationPromptContext.Build("animacoes/7-aceno.json", "Orc", Array.Empty<string>());

        text.Should().Contain("Armas do modelo: Machado (mão direita), Escudo (mão esquerda)");
        text.Should().Contain("não fazem parte do arquivo da animação");
        without.Should().NotContain("Armas do modelo");
    }
}
