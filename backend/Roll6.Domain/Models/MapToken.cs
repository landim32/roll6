using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

public class MapToken
{
    public const int MAX_LOOK = 5;

    public long MapTokenId { get; set; }
    public long MapId { get; set; }
    public long TokenId { get; set; }

    /// <summary>
    /// Participation shown by a Character token (name, vitals, status and sheet come from it); required for
    /// the Character type and absent for the others. At most one per map.
    /// </summary>
    public long? CampaignCharacterId { get; set; }

    /// <summary>NPC occurrence shown by an Npc piece (name, vitals and status come from it). At most one piece per occurrence.</summary>
    public long? MapNpcId { get; set; }
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

    /// <summary>
    /// Where the 3D walk (069) left the figure inside its hex, in map pixels, and the exact direction it faces (radians,
    /// the walker's yaw). The 2D map draws the piece at the middle of <see cref="X"/>/<see cref="Y"/>; the 3D view draws it
    /// here, so stopping between two hexes does not jump. Any other move clears them (<see cref="MoveTo"/>).
    /// </summary>
    public double? WalkX { get; set; }
    public double? WalkY { get; set; }
    public double? WalkYaw { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public void Update(string? name, int tokenType, string? sheet, int life, int energy, string? status, int move, int x, int y, int? look)
    {
        if (!Enum.IsDefined(typeof(MapTokenType), tokenType))
            throw new DomainValidationException("tokenType", "O tipo deve ser 1 (Character), 2 (Npc) ou 4 (Object).");

        if ((tokenType == (int)MapTokenType.Character) != CampaignCharacterId.HasValue)
            throw new DomainValidationException("campaignCharacterId", "Tokens de personagem precisam estar ligados a um personagem da campanha.");
        if ((tokenType == (int)MapTokenType.Npc) != MapNpcId.HasValue)
            throw new DomainValidationException("mapNpcId", "Peças de NPC precisam estar ligadas a um NPC do mapa.");

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

    /// <summary>A character of the campaign placed on the map: its data is read from the participation.</summary>
    public static MapToken PlaceCharacter(long mapId, long tokenId, long campaignCharacterId, string characterName, int x, int y)
    {
        var mapToken = new MapToken { MapId = mapId, TokenId = tokenId, CampaignCharacterId = campaignCharacterId };
        mapToken.Update(characterName, (int)MapTokenType.Character, null, 0, 0, null, 0, x, y, 0);
        mapToken.CreatedAt = mapToken.UpdatedAt;
        return mapToken;
    }

    /// <summary>The piece of an NPC occurrence: Npc type, its data is read from the <see cref="MapNpc"/>.</summary>
    public static MapToken PlaceNpc(long mapId, long tokenId, long mapNpcId, string name, int x, int y, int? look)
    {
        var mapToken = new MapToken { MapId = mapId, TokenId = tokenId, MapNpcId = mapNpcId };
        mapToken.Update(name, (int)MapTokenType.Npc, null, 0, 0, null, 0, x, y, look);
        mapToken.CreatedAt = mapToken.UpdatedAt;
        return mapToken;
    }

    /// <summary>Another library token for the same piece: position, facing, type and link are kept.</summary>
    public void ChangeToken(long tokenId)
    {
        TokenId = tokenId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MoveTo(int x, int y)
    {
        X = x;
        Y = y;
        WalkX = null;
        WalkY = null;
        WalkYaw = null;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// The exact place of a 3D walk (069): the point must lie in the piece's hex (cube rounding, as the client computes
    /// it). Call after <see cref="MoveTo"/>, which clears it.
    /// </summary>
    public void WalkTo(double x, double y, double yaw)
    {
        if (!double.IsFinite(x) || !double.IsFinite(y))
            throw new DomainValidationException("walkX", "A posição do andar é inválida.");
        if (!double.IsFinite(yaw))
            throw new DomainValidationException("walkYaw", "A direção do andar é inválida.");
        if (HexGrid.PixelToHex(x, y, HexGrid.HEX_SIZE) != (X, Y))
            throw new DomainValidationException("walkX", "A posição do andar não está no hex da peça.");
        WalkX = x;
        WalkY = y;
        WalkYaw = Math.Atan2(Math.Sin(yaw), Math.Cos(yaw));
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Turns the piece to one of the six sides (0 top … 5 top-left, clockwise).</summary>
    public void Face(int look)
    {
        if (look < 0 || look > MAX_LOOK)
            throw new DomainValidationException("look", $"O campo look deve estar entre 0 e {MAX_LOOK}.");
        Look = look;
        UpdatedAt = DateTime.UtcNow;
    }
}
