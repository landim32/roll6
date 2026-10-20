using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Console.Bridge;

/// <summary>
/// The console's log lines (097, contracts/console-log.md): the header of a request, the campaign line put in front of
/// the model, the request id on every line, tool inputs compacted, results cut to a head, and the API key redacted.
/// Pure: nothing here prints.
/// </summary>
public static partial class LogLines
{
    /// <summary>Longest string value kept inside a compacted tool input.</summary>
    public const int PER_STRING = 400;

    /// <summary>Longest compacted tool input.</summary>
    public const int TOTAL = 1500;

    /// <summary>Longest head of a tool result.</summary>
    public const int RESULT = 600;

    /// <summary>The line the model reads first: the campaign the request is about, and nothing else counts.</summary>
    public static string CampaignLine(RunCampaignInfo campaign)
    {
        var turn = campaign.TurnNo is int t ? $", turno {t}" : string.Empty;
        return $"CAMPANHA DO PEDIDO: «{campaign.Name}» (campaignId {campaign.CampaignId}){turn}. Trabalhe só nela; ignore campanha/roll6.json.";
    }

    /// <summary>"Pedido #42 (GM): campanha «Tormento Vil II» (campaignId 3), turno 15 · Claude, sessão nova".</summary>
    public static string Header(RunInfo run)
    {
        var kind = run.ReadOnly ? "pergunta, somente leitura"
            : run.IsCodex ? "gerador"
            : run.Campaign?.TurnNo != null ? "GM"
            : "editor";
        var campaign = run.Campaign is { } c
            ? $": campanha «{c.Name}» (campaignId {c.CampaignId})" + (c.TurnNo is int t ? $", turno {t}" : string.Empty)
            : string.Empty;
        var engine = run.IsCodex ? "Codex" : "Claude";
        var session = run.Started || (run.IsCodex && !string.IsNullOrEmpty(run.Resume)) ? "retomada" : "nova";
        return $"Pedido #{run.RequestId} ({kind}){campaign} · {engine}, sessão {session}";
    }

    /// <summary>The request id on the line, continuation lines indented under it; a line of no request is left alone.</summary>
    public static string Prefix(long? requestId, string text)
    {
        if (requestId == null)
            return text;
        var prefix = $"#{requestId}  ";
        var pad = new string(' ', prefix.Length);
        return prefix + text.Replace("\r\n", "\n").TrimEnd('\n').Replace("\n", "\n" + pad);
    }

    /// <summary>A tool's input as one line of JSON, every string cut at <paramref name="perString"/>, the whole at <paramref name="total"/>.</summary>
    public static string Compact(JsonElement input, int perString = PER_STRING, int total = TOTAL)
    {
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = false, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping }))
            WriteCut(writer, input, perString);
        return Cut(Encoding.UTF8.GetString(stream.ToArray()), total);
    }

    private static void WriteCut(Utf8JsonWriter writer, JsonElement element, int perString)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartObject();
                foreach (var property in element.EnumerateObject())
                {
                    writer.WritePropertyName(property.Name);
                    WriteCut(writer, property.Value, perString);
                }
                writer.WriteEndObject();
                break;
            case JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray())
                    WriteCut(writer, item, perString);
                writer.WriteEndArray();
                break;
            case JsonValueKind.String:
                writer.WriteStringValue(Cut(OneLine(element.GetString() ?? string.Empty), perString));
                break;
            default:
                element.WriteTo(writer);
                break;
        }
    }

    /// <summary>The head of a text: one line, whitespace collapsed, cut at <paramref name="max"/>.</summary>
    public static string Head(string? text, int max = RESULT) => Cut(OneLine(text ?? string.Empty), max);

    /// <summary>The API key never reaches the screen, wherever it shows up.</summary>
    public static string Redact(string line) => Key().Replace(line, "r6_…");

    public static string Cut(string text, int max) => text.Length <= max ? text : text[..Math.Max(0, max - 1)].TrimEnd() + "…";

    private static string OneLine(string text) => string.Join(' ', text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    [GeneratedRegex(@"r6_[A-Za-z0-9_-]{16,}")]
    private static partial Regex Key();
}
