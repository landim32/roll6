using System.Text.Encodings.Web;
using System.Text.Json;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Console.Claude;

/// <summary>
/// The request as the CLI reads it with <c>--input-format stream-json</c> (062, contracts/claude-cli.md): one user message
/// line with the pictures first (images are read best before the text) and the text, which names each picture by its
/// caption. The pictures come from the server already as base64 PNG.
/// </summary>
public static class PromptMessage
{
    /// <summary>Accents stay readable in the line the CLI reads (the pictures are base64 anyway).</summary>
    private static readonly JsonSerializerOptions JSON = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public static string Build(string text, IReadOnlyList<PromptImageInfo> images)
    {
        var content = new List<object>();
        foreach (var image in images)
            content.Add(new { type = "image", source = new { type = "base64", media_type = "image/png", data = image.Png } });
        var body = text;
        if (images.Count > 0)
        {
            var captions = images.Select((image, index) => $"Imagem {index + 1}: {image.Caption}");
            body = $"{text}\n\n{string.Join("\n", captions)}";
        }
        content.Add(new { type = "text", text = body });
        return JsonSerializer.Serialize(new { type = "user", message = new { role = "user", content } }, JSON) + "\n";
    }
}
