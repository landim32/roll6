using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.DTO.Map;

namespace Roll6.Domain.Maps;

/// <summary>A hex to paint (107), already checked: kind and text (only for Mark, trimmed, null when empty).</summary>
public sealed record HexMarkWrite(int X, int Y, HexMarkKind Kind, string? Text);

/// <summary>The checked batch of a PUT …/hex-marks (107): hexes to paint and hexes to clear.</summary>
public sealed record HexMarkBatch(IReadOnlyList<HexMarkWrite> Upserts, IReadOnlyList<(int X, int Y)> Removals);

/// <summary>
/// The hexes the paint tool sends at once (107), checked as a whole before anything is written. The first error is
/// keyed by the item's position (<c>marks[i].x</c>, <c>marks[i].kind</c>, <c>marks[i].text</c>) or <c>marks</c>.
/// </summary>
public static class HexMarkSet
{
    public const int MAX_ITEMS = 200;
    public const string EMPTY = "Informe de 1 a 200 hexes.";
    public const string OUTSIDE = "O hex está fora do mapa.";
    public const string REPEATED = "Hex repetido.";
    public const string UNKNOWN_KIND = "O tipo deve ser de 1 a 7.";
    public const string TEXT_ONLY_MARK = "Só a marcação aceita texto.";
    public static readonly string TEXT_TOO_LONG = $"O texto deve ter até {Models.MapHexMark.MAX_TEXT} caracteres.";

    public static bool IsKnownKind(int kind) => Enum.IsDefined(typeof(HexMarkKind), kind);

    public static HexMarkBatch Parse(IReadOnlyList<MapHexMarkWriteInfo>? items, int columns, int rows)
    {
        if (items == null || items.Count == 0 || items.Count > MAX_ITEMS)
            throw new DomainValidationException("marks", EMPTY);
        var upserts = new List<HexMarkWrite>();
        var removals = new List<(int X, int Y)>();
        var seen = new HashSet<(int, int)>();
        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i] ?? throw new DomainValidationException($"marks[{i}].x", OUTSIDE);
            if (!HexGrid.IsInsideGrid(item.X, item.Y, columns, rows))
                throw new DomainValidationException($"marks[{i}].x", OUTSIDE);
            if (!seen.Add((item.X, item.Y)))
                throw new DomainValidationException($"marks[{i}].x", REPEATED);
            var text = string.IsNullOrWhiteSpace(item.Text) ? null : item.Text.Trim();
            if (item.Kind is not int kind)
            {
                removals.Add((item.X, item.Y));
                continue;
            }
            if (!IsKnownKind(kind))
                throw new DomainValidationException($"marks[{i}].kind", UNKNOWN_KIND);
            if (text != null && kind != (int)HexMarkKind.Mark)
                throw new DomainValidationException($"marks[{i}].text", TEXT_ONLY_MARK);
            if (text != null && text.Length > Models.MapHexMark.MAX_TEXT)
                throw new DomainValidationException($"marks[{i}].text", TEXT_TOO_LONG);
            upserts.Add(new HexMarkWrite(item.X, item.Y, (HexMarkKind)kind, text));
        }
        return new HexMarkBatch(upserts, removals);
    }
}
