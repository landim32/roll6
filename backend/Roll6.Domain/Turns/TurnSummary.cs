using System.Text;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;

namespace Roll6.Domain.Turns;

/// <summary>One turn entry ready to be written (024): labels already resolved by the service.</summary>
public sealed record SummaryLine
{
    public TurnType Type { get; init; }

    /// <summary>"Cedric (José)" for characters, "Goblin (GM)" for NPCs.</summary>
    public string Actor { get; init; } = string.Empty;

    /// <summary>Who made it when it was not the actor's owner ("GM (Rodrigo)"); null = the actor itself.</summary>
    public string? Author { get; init; }

    public bool IsNpc { get; init; }
    public (int X, int Y, int Look)? Before { get; init; }
    public (int X, int Y, int Look)? After { get; init; }
    public int? Moved { get; init; }

    /// <summary>Movement points spent by the actor in the turn up to this entry.</summary>
    public int MovedTotal { get; init; }

    public string? Description { get; init; }
    public IReadOnlyList<TurnChange>? Changes { get; init; }
}

/// <summary>Where a character/NPC piece is (column/row, odd-q) and where it looks.</summary>
public sealed record SummaryPosition(string Actor, int X, int Y, int Look);

/// <summary>
/// Readable markdown of a turn (024): "## Ações" (entries in order) and "## Posições" (pieces by name). Pure: the
/// service resolves names, authors and positions.
/// </summary>
public static class TurnSummary
{
    /// <summary>Flat-top hexes have no east/west side: look 0–5 clockwise from the top.</summary>
    private static readonly string[] DIRECTIONS = { "Norte", "Nordeste", "Sudeste", "Sul", "Sudoeste", "Noroeste" };

    private static readonly HashSet<string> NUMBER_FIELDS = new() { "currentLife", "currentEnergy", "life", "energy", "move" };

    public static string Direction(int look) => look >= 0 && look < DIRECTIONS.Length ? DIRECTIONS[look] : look.ToString();

    public static string Build(IEnumerable<SummaryLine> lines, IEnumerable<SummaryPosition> positions)
    {
        var text = new StringBuilder(BuildActions(lines));
        text.Append("## Posições\n");
        var pieces = positions.OrderBy(p => p.Actor, StringComparer.CurrentCultureIgnoreCase).ToList();
        foreach (var piece in pieces)
            text.Append($"- {Escape(piece.Actor)} - ({piece.X}, {piece.Y}) - {Direction(piece.Look)}\n");
        if (pieces.Count == 0)
            text.Append("Nenhuma peça no mapa.\n");
        return text.ToString();
    }

    /// <summary>Only the "## Ações" section (027: the turn data for AI assistants).</summary>
    public static string BuildActions(IEnumerable<SummaryLine> lines)
    {
        var text = new StringBuilder("## Ações\n");
        var any = false;
        foreach (var line in lines)
        {
            text.Append(Write(line)).Append('\n');
            any = true;
        }
        if (!any)
            text.Append("Nenhuma ação registrada.\n");
        return text.ToString();
    }

    private static string Write(SummaryLine line)
    {
        var actor = Escape(line.Actor);
        var author = line.Author == null ? null : Escape(line.Author);
        return line.Type switch
        {
            TurnType.Movement => $"{actor}: {Movement(line)}",
            TurnType.Action => $"{actor}: \"{Escape(line.Description)}\"",
            TurnType.ActionResult => $"{author ?? actor}: Resultado para {actor}: {Escape(line.Description)}",
            TurnType.Narration => Narration(author, line.Description),
            TurnType.CharacterUpdate => author == null
                ? $"{actor}: Alterou: {Changes(line)}"
                : $"{author}: Alterou {actor}: {Changes(line)}",
            _ => $"{actor}: {Escape(line.Description)}"
        };
    }

    /// <summary>
    /// The master writes the narration as markdown. The name stays escaped; the text keeps its lines
    /// (emphasis, rules, lists) and a trailing blank line so the next entry is not pulled into it.
    /// </summary>
    private static string Narration(string? author, string? description)
    {
        var label = $"{author ?? "GM"}:";
        var body = description?.ReplaceLineEndings("\n").Trim();
        if (string.IsNullOrEmpty(body))
            return label;
        return label + "\n\n" + body + "\n";
    }

    private static string Movement(SummaryLine line)
    {
        var text = new StringBuilder("Moveu");
        if (line.Before is { } from)
            text.Append($" de ({from.X}, {from.Y}) olhando para o {Direction(from.Look)}");
        if (line.After is { } to)
            text.Append($" para ({to.X}, {to.Y}) olhando para o {Direction(to.Look)}");
        if (line.Moved is int moved)
            text.Append($", gastou {moved} {(moved == 1 ? "ponto" : "pontos")} de movimento ({line.MovedTotal})");
        return text.ToString();
    }

    private static string Changes(SummaryLine line) =>
        string.Join("; ", (line.Changes ?? Array.Empty<TurnChange>()).Select(c => Change(c, line.IsNpc)));

    private static string Change(TurnChange change, bool isNpc)
    {
        if (change.Field == "notes")
            return "Anotações alteradas";
        var label = change.Field switch
        {
            "currentLife" => "Vida",
            "currentEnergy" => "Energia",
            "life" => isNpc ? "Vida" : "Vida total",
            "energy" => isNpc ? "Energia" : "Energia total",
            "move" => "Movimento",
            "name" => "Nome",
            "characterStatus" or "status" => "Status",
            "posture" => "Postura",
            _ => change.Field
        };
        return $"{label} de {Value(change.Field, change.Before)} para {Value(change.Field, change.After)}";
    }

    private static string Value(string field, string? value)
    {
        if (string.IsNullOrEmpty(value))
            return "(vazio)";
        if (field == "posture")
            return $"\"{PostureName(value)}\"";
        return NUMBER_FIELDS.Contains(field) ? value : $"\"{Escape(value)}\"";
    }

    /// <summary>Label of a posture stored as its number (031).</summary>
    public static string PostureName(string value) => value switch
    {
        "1" => "Em pé",
        "2" => "Caído",
        "3" => "Fora de combate",
        _ => value
    };

    /// <summary>Names and free texts are written as text: markdown characters get a backslash.</summary>
    private static string Escape(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;
        var text = new StringBuilder(value.Length);
        foreach (var ch in value.ReplaceLineEndings(" "))
        {
            if ("\\`*_[]#<>".IndexOf(ch) >= 0)
                text.Append('\\');
            text.Append(ch);
        }
        return text.ToString();
    }
}
