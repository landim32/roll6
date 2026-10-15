using System.Globalization;
using System.Text.Json;
using Roll6Anime.Core.Markup;

namespace Roll6Anime.Core.Claude;

/// <summary>The key pose of a print (1-based): on a pose when <c>From == To</c>, else between two of <c>Count</c>.</summary>
public sealed record CapturePose(int From, int To, int Count)
{
    /// <summary>"na pose 3 de 5" or "entre as poses 2 e 3 (de 5)".</summary>
    public string Describe() => From == To ? $"na pose {From} de {Count}" : $"entre as poses {From} e {To} (de {Count})";
}

/// <summary>A print of the 3D view attached to a request: the PNG and the text that says what it shows.</summary>
public sealed record PromptImage(byte[] Png, string Caption)
{
    private static readonly (MarkKind Kind, string One, string Many)[] NAMES =
    {
        (MarkKind.Pencil, "traço à mão", "traços à mão"),
        (MarkKind.Rectangle, "retângulo", "retângulos"),
        (MarkKind.Ellipse, "circunferência", "circunferências"),
        (MarkKind.Arrow, "seta", "setas"),
    };

    /// <summary>
    /// What the caption of a marked print adds (064, FR-009): the red shapes are the user's, pointing at parts of the
    /// picture, and how many of each there are — so the Claude does not take them for things in the scene. Empty
    /// without marks.
    /// </summary>
    public static string MarkupNote(IReadOnlyList<Mark> marks)
    {
        if (marks.Count == 0)
            return string.Empty;
        var counts = NAMES
            .Select(name => (name, count: marks.Count(mark => mark.Kind == name.Kind)))
            .Where(item => item.count > 0)
            .Select(item => $"{item.count} {(item.count == 1 ? item.name.One : item.name.Many)}");
        return " Marcações em vermelho desenhadas pelo usuário para apontar partes da imagem (não fazem parte da cena): "
            + string.Join(", ", counts) + ".";
    }
}

/// <summary>
/// What the 3D view reported when it was printed: the PNG, the animation's instant (null without an animation) and
/// where the camera was, around the character (<c>Azimuth</c> 0° = in front, positive toward its left — the
/// character's +X — up to ±180° behind; <c>Elevation</c> above the middle of the model) and whether the skeleton was
/// showing (065).
/// </summary>
public sealed record ViewCapture(byte[] Png, double? Time, double? Duration, bool Paused, double Azimuth, double Elevation, bool Skeleton = false, CapturePose? Pose = null)
{
    /// <summary>What the caption adds when the print shows the skeleton (065): what the lines and their colors are.</summary>
    public const string SKELETON_NOTE = " Esqueleto visível: o modelo aparece semitransparente e as linhas são os ossos (âmbar = movimentados pela animação aberta, ciano = os demais).";

    private static readonly CultureInfo BRAZIL = CultureInfo.GetCultureInfo("pt-BR");

    /// <summary>The caption in Portuguese: which animation, which instant and from where the camera looks.</summary>
    public string Caption(string? animationName)
    {
        var what = animationName == null || Time is not { } time || Duration is not { } duration
            ? "o modelo na pose de descanso, sem animação"
            : $"a animação {animationName} no instante {Seconds(time)} de {Seconds(duration)}{(Paused ? " (pausada)" : " (tocando)")}"
              + (Pose is { } pose ? $", {pose.Describe()} (as poses são os instantes com chave no arquivo)" : string.Empty);
        return $"print da vista 3D do roll6anime: {what}; câmera {Camera()}." + (Skeleton ? SKELETON_NOTE : string.Empty);
    }

    private string Camera()
    {
        var azimuth = Math.Round(Azimuth);
        var side = Math.Abs(azimuth) switch
        {
            <= 10 => "de frente para o personagem",
            >= 170 => "atrás do personagem (vê as costas)",
            _ => $"{Degrees(azimuth)} da frente, para o lado {(azimuth > 0 ? "esquerdo" : "direito")} do personagem",
        };
        var elevation = Math.Round(Elevation);
        var height = Math.Abs(elevation) <= 5
            ? "na altura do meio do corpo"
            : $"{Degrees(elevation)} {(elevation > 0 ? "acima" : "abaixo")} do meio do corpo";
        return $"{side}, {height}";
    }

    private static string Degrees(double value) => $"{Math.Abs(value).ToString(CultureInfo.InvariantCulture)}°";

    private static string Seconds(double seconds) => $"{seconds.ToString("0.00", BRAZIL)} s";
}

/// <summary>
/// The request as the CLI reads it with <c>--input-format stream-json</c> (contracts/claude-cli.md): one user message
/// line with the prints first (images are read best before the text) and the text, which names each print.
/// </summary>
public static class PromptMessage
{
    public static string Build(string text, IReadOnlyList<PromptImage> images)
    {
        var content = new List<object>();
        foreach (var image in images)
            content.Add(new { type = "image", source = new { type = "base64", media_type = "image/png", data = Convert.ToBase64String(image.Png) } });
        var body = text;
        if (images.Count > 0)
        {
            var captions = images.Select((image, index) => $"Imagem {index + 1}: {image.Caption}");
            body = $"{text}\n\n{string.Join("\n", captions)}";
        }
        content.Add(new { type = "text", text = body });
        return JsonSerializer.Serialize(new { type = "user", message = new { role = "user", content } }) + "\n";
    }
}
