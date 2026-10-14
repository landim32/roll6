using System.Text.Json;
using FluentAssertions;
using Roll6Anime.Core.Claude;

namespace Roll6Anime.Tests;

/// <summary>Prints of the 3D view sent with a request: the caption and the stream-json message.</summary>
public class PromptImageTests
{
    private static readonly byte[] PNG = { 0x89, 0x50, 0x4E, 0x47 };

    [Fact]
    public void TheCaptionTellsTheInstantAndTheCamera()
    {
        var capture = new ViewCapture(PNG, 0.8, 1.2, true, 32.4, 18);

        capture.Caption("animacoes/aceno.json").Should().Be(
            "print da vista 3D do roll6anime: a animação animacoes/aceno.json no instante 0,80 s de 1,20 s (pausada); " +
            "câmera 32° da frente, para o lado esquerdo do personagem, 18° acima do meio do corpo.");
    }

    [Theory]
    [InlineData(4, 2, "câmera de frente para o personagem, na altura do meio do corpo.")]
    [InlineData(-90, -12, "câmera 90° da frente, para o lado direito do personagem, 12° abaixo do meio do corpo.")]
    [InlineData(178, 0, "câmera atrás do personagem (vê as costas), na altura do meio do corpo.")]
    public void TheCameraIsSaidFromTheCharactersPointOfView(double azimuth, double elevation, string expected)
    {
        new ViewCapture(PNG, 0.5, 1, false, azimuth, elevation).Caption("a.json").Should().EndWith(expected);
    }

    [Fact]
    public void WithoutAnAnimationItIsTheRestPose()
    {
        new ViewCapture(PNG, null, null, true, 0, 0).Caption(null).Should()
            .StartWith("print da vista 3D do roll6anime: o modelo na pose de descanso, sem animação;");
    }

    [Fact]
    public void TheMessageCarriesTheImagesBeforeTheTextAndNamesThem()
    {
        var line = PromptMessage.Build("feche a mão", new[] { new PromptImage(PNG, "print A"), new PromptImage(PNG, "print B") });

        line.Should().EndWith("\n");
        using var document = JsonDocument.Parse(line);
        var root = document.RootElement;
        root.GetProperty("type").GetString().Should().Be("user");
        var content = root.GetProperty("message").GetProperty("content");
        content.GetArrayLength().Should().Be(3);
        content[0].GetProperty("type").GetString().Should().Be("image");
        content[0].GetProperty("source").GetProperty("media_type").GetString().Should().Be("image/png");
        content[0].GetProperty("source").GetProperty("data").GetString().Should().Be(Convert.ToBase64String(PNG));
        content[2].GetProperty("text").GetString().Should().Be("feche a mão\n\nImagem 1: print A\nImagem 2: print B");
    }

    [Fact]
    public void WithoutImagesItIsOnlyTheText()
    {
        using var document = JsonDocument.Parse(PromptMessage.Build("oi", Array.Empty<PromptImage>()));
        var content = document.RootElement.GetProperty("message").GetProperty("content");
        content.GetArrayLength().Should().Be(1);
        content[0].GetProperty("text").GetString().Should().Be("oi");
    }
}
