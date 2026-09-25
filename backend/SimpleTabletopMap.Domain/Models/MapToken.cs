using SimpleTabletopMap.Domain.Enums;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Validation;

namespace SimpleTabletopMap.Domain.Models;

public class MapToken
{
    public const int MAX_LOOK = 5;

    public long MapTokenId { get; set; }
    public long MapId { get; set; }
    public long TokenId { get; set; }
    public string Name { get; set; } = string.Empty;
    public MapTokenType TokenType { get; set; }
    public string? Sheet { get; set; }
    public int Life { get; set; }
    public int Energy { get; set; }
    public string? Status { get; set; }
    public int Move { get; set; }

    /// <summary>
    /// Cell of the map model grid: X = column, Y = row, "odd-q" offset layout of flat-top hexes
    /// (constitution v4.0.0). Convert with HexGrid.OffsetToAxial before any distance/neighbor math.
    /// </summary>
    public int X { get; set; }
    public int Y { get; set; }

    /// <summary>
    /// Hex side the token faces, clockwise from the top of a flat-top hex:
    /// 0 top, 1 top-right, 2 bottom-right, 3 bottom, 4 bottom-left, 5 top-left.
    /// </summary>
    public int Look { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public void Update(string? name, int tokenType, string? sheet, int life, int energy, string? status, int move, int x, int y, int? look)
    {
        if (!Enum.IsDefined(typeof(MapTokenType), tokenType))
            throw new DomainValidationException("tokenType", "O tipo deve ser 1 (Character), 2 (Npc), 3 (Enemy) ou 4 (Object).");

        Name = Guard.RequiredText(name, "name", 260);
        TokenType = (MapTokenType)tokenType;
        Sheet = Guard.OptionalText(sheet, "sheet", 20000);
        Life = life;
        Energy = energy;
        Status = Guard.OptionalText(status, "status", 260);
        Move = Guard.NonNegative(move, "move");
        var facing = look ?? 0;
        if (facing < 0 || facing > MAX_LOOK)
            throw new DomainValidationException("look", $"O campo look deve estar entre 0 e {MAX_LOOK}.");
        Look = facing;
        MoveTo(x, y);
    }

    public void MoveTo(int x, int y)
    {
        X = x;
        Y = y;
        UpdatedAt = DateTime.UtcNow;
    }
}
