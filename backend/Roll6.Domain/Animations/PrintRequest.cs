using System.Globalization;
using System.Text.Json;
using Roll6.DTO.Realtime.Animation;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Domain.Animations;

/// <summary>The outcome of parsing a <c>print_stage</c> call: the shots, or the Portuguese reason it was refused.</summary>
public sealed record PrintParse(IReadOnlyList<PrintShotInfo> Shots, string? Error)
{
    public bool IsValid => Error == null;
}

/// <summary>
/// The tool <c>print_stage</c> of the animation editor (094, contracts/editor-prints.md): its definition for the run,
/// the parsing of the Claude's arguments (defaults, limits) and the texts it answers with. Pure.
/// </summary>
public static class PrintRequest
{
    public const string TOOL_NAME = "print_stage";
    public const int MAX_SHOTS = 6;
    public const int MAX_PER_REQUEST = 30;
    public const string KEY = "key";
    public const string DEFAULT_VIEW = "three-quarter";

    /// <summary>How long the server waits for the editor tab.</summary>
    public static readonly TimeSpan TIMEOUT = TimeSpan.FromSeconds(20);

    public static readonly IReadOnlyList<string> VIEWS = new[] { "front", "back", "right", "left", "top", "three-quarter" };

    public const string INVALID = "Pedido de print inválido: {0}";
    public const string LIMIT = "Limite de 30 prints por pedido atingido.";
    public const string INVALID_FILE = "O arquivo atual não é uma animação válida: {0}";
    public const string NO_EDITOR = "O editor não está aberto; não há como tirar o print.";
    public const string TIMED_OUT = "O editor não respondeu em 20 s; tente de novo.";
    public const string ENDED = "O pedido foi encerrado.";
    public const string UNKNOWN_TOOL = "Ferramenta desconhecida: {0}.";
    public const string NO_SHOTS = "O editor não devolveu nenhum print.";

    private const string DESCRIPTION =
        "Takes prints of the animation editor's stage showing the user's 3D model playing the LATEST version of the " +
        "animation file you wrote in this request (not the saved one), and returns them as images with Portuguese " +
        "captions. Use it after every change to the file to check the result before answering. Each shot picks an " +
        "instant (seconds from the start, or \"key\" for the key pose), a camera view and whether the skeleton is drawn. " +
        "At most 6 shots per call and 30 per request.";

    private const string SCHEMA = """
        {
          "type": "object",
          "properties": {
            "shots": {
              "type": "array",
              "minItems": 1,
              "maxItems": 6,
              "description": "The prints to take, in order. Omit for one print of the key pose from three-quarter view.",
              "items": {
                "type": "object",
                "properties": {
                  "time": {
                    "description": "Seconds from the start of the animation (clamped to its duration), or \"key\" for the key pose. Default \"key\".",
                    "anyOf": [ { "type": "number", "minimum": 0 }, { "type": "string", "enum": ["key"] } ]
                  },
                  "view": {
                    "type": "string",
                    "enum": ["front", "back", "right", "left", "top", "three-quarter"],
                    "description": "Camera side around the character (right/left are the character's own sides). Default three-quarter."
                  },
                  "skeleton": {
                    "type": "boolean",
                    "description": "Draw the bones over a see-through model (amber = moved by the animation). Default false."
                  }
                }
              }
            }
          }
        }
        """;

    /// <summary>The tool sent in <c>run.tools</c> of every editor request.</summary>
    public static ToolInfo ToolDefinition()
    {
        using var schema = JsonDocument.Parse(SCHEMA);
        return new ToolInfo { Name = TOOL_NAME, Description = DESCRIPTION, InputSchema = schema.RootElement.Clone() };
    }

    /// <summary>The Claude's arguments → shots with the defaults filled; an error explains what was wrong.</summary>
    public static PrintParse Parse(JsonElement arguments)
    {
        if (arguments.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            return new PrintParse(new[] { DefaultShot() }, null);
        if (arguments.ValueKind != JsonValueKind.Object)
            return Fail("os argumentos devem ser um objeto.");
        if (!arguments.TryGetProperty("shots", out var shots) || shots.ValueKind is JsonValueKind.Null)
            return new PrintParse(new[] { DefaultShot() }, null);
        if (shots.ValueKind != JsonValueKind.Array)
            return Fail("\"shots\" deve ser uma lista.");
        var count = shots.GetArrayLength();
        if (count == 0)
            return new PrintParse(new[] { DefaultShot() }, null);
        if (count > MAX_SHOTS)
            return Fail($"no máximo {MAX_SHOTS} prints por chamada (vieram {count}).");

        var result = new List<PrintShotInfo>();
        var index = 0;
        foreach (var shot in shots.EnumerateArray())
        {
            index++;
            if (shot.ValueKind != JsonValueKind.Object)
                return Fail($"o print {index} deve ser um objeto.");
            var time = KeyTime();
            if (shot.TryGetProperty("time", out var given) && given.ValueKind != JsonValueKind.Null)
            {
                if (given.ValueKind == JsonValueKind.Number && given.TryGetDouble(out var seconds) && double.IsFinite(seconds))
                {
                    if (seconds < 0)
                        return Fail($"o instante do print {index} não pode ser negativo.");
                    time = Number(seconds);
                }
                else if (!(given.ValueKind == JsonValueKind.String && string.Equals(given.GetString(), KEY, StringComparison.OrdinalIgnoreCase)))
                    return Fail($"o instante do print {index} deve ser um número de segundos ou \"key\".");
            }
            var view = DEFAULT_VIEW;
            if (shot.TryGetProperty("view", out var viewElement) && viewElement.ValueKind != JsonValueKind.Null)
            {
                var name = viewElement.ValueKind == JsonValueKind.String ? viewElement.GetString()?.Trim().ToLowerInvariant() : null;
                if (name == null || !VIEWS.Contains(name))
                    return Fail($"o lado do print {index} deve ser um de: {string.Join(", ", VIEWS)}.");
                view = name;
            }
            var skeleton = false;
            if (shot.TryGetProperty("skeleton", out var skeletonElement) && skeletonElement.ValueKind != JsonValueKind.Null)
            {
                if (skeletonElement.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                    return Fail($"\"skeleton\" do print {index} deve ser verdadeiro ou falso.");
                skeleton = skeletonElement.GetBoolean();
            }
            result.Add(new PrintShotInfo { Time = time, View = view, Skeleton = skeleton });
        }
        return new PrintParse(result, null);
    }

    /// <summary>The text that goes with the images: "Print 1: …" per caption, in order.</summary>
    public static string ResultText(IReadOnlyList<string> captions) =>
        string.Join("\n", captions.Select((caption, i) => $"Print {i + 1}: {caption}"));

    private static PrintShotInfo DefaultShot() => new() { Time = KeyTime(), View = DEFAULT_VIEW, Skeleton = false };

    private static PrintParse Fail(string reason) => new(Array.Empty<PrintShotInfo>(), string.Format(INVALID, reason));

    private static JsonElement KeyTime()
    {
        using var document = JsonDocument.Parse("\"key\"");
        return document.RootElement.Clone();
    }

    private static JsonElement Number(double seconds)
    {
        using var document = JsonDocument.Parse(seconds.ToString("R", CultureInfo.InvariantCulture));
        return document.RootElement.Clone();
    }
}
