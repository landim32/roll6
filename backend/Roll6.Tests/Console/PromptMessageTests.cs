using System.Text.Json;
using FluentAssertions;
using Roll6.Console.Claude;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Tests.Console;

/// <summary>The stream-json user message the console writes to the Claude (086; from 062).</summary>
public class PromptMessageTests
{
    private const string PNG = "iVBORw0KGgo=";

    [Fact]
    public void TheMessageCarriesTheImagesBeforeTheTextAndNamesThem()
    {
        var line = PromptMessage.Build("feche a mão", new[]
        {
            new PromptImageInfo { Png = PNG, Caption = "print A" },
            new PromptImageInfo { Png = PNG, Caption = "print B" },
        });

        line.Should().EndWith("\n");
        using var document = JsonDocument.Parse(line);
        var root = document.RootElement;
        root.GetProperty("type").GetString().Should().Be("user");
        var content = root.GetProperty("message").GetProperty("content");
        content.GetArrayLength().Should().Be(3);
        content[0].GetProperty("type").GetString().Should().Be("image");
        content[0].GetProperty("source").GetProperty("media_type").GetString().Should().Be("image/png");
        content[0].GetProperty("source").GetProperty("data").GetString().Should().Be(PNG);
        content[2].GetProperty("text").GetString().Should().Be("feche a mão\n\nImagem 1: print A\nImagem 2: print B");
    }

    [Fact]
    public void WithoutImagesItIsOnlyTheText()
    {
        using var document = JsonDocument.Parse(PromptMessage.Build("oi", Array.Empty<PromptImageInfo>()));
        var content = document.RootElement.GetProperty("message").GetProperty("content");
        content.GetArrayLength().Should().Be(1);
        content[0].GetProperty("text").GetString().Should().Be("oi");
    }
}
