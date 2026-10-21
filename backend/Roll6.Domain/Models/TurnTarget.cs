using Roll6.Domain.Turns;

namespace Roll6.Domain.Models;

/// <summary>
/// What an action is about (098, "Agir sobre…"): a hex of the actor's map, the distance from the actor's piece and,
/// when a piece covered the hex, a <b>snapshot</b> of that piece as the table showed it when the action was declared
/// — never re-read afterwards (the target may move, fall or leave the map before the turn is processed). Stored as
/// JSON in <c>turns.target</c>; null = an action without a target.
/// </summary>
public class TurnTarget
{
    public const string KIND_CHARACTER = "character";
    public const string KIND_NPC = "npc";
    public const string KIND_OBJECT = "object";

    /// <summary>The actor's own piece.</summary>
    public const string SIDE_SELF = "self";

    /// <summary>A character (characters are allies to each other) or an NPC with category Aliado.</summary>
    public const string SIDE_ALLY = "ally";

    public const string SIDE_ENEMY = "enemy";
    public const string SIDE_NEUTRAL = "neutral";
    public const string SIDE_OBJECT = "object";

    public int X { get; set; }
    public int Y { get; set; }

    /// <summary>Hexes from the actor's piece to the target hex (<see cref="Grid.HexGrid.Distance"/>).</summary>
    public int Distance { get; set; }

    /// <summary>The piece that covered the hex; null = empty hex.</summary>
    public long? MapTokenId { get; set; }

    /// <summary>character | npc | object (null for an empty hex).</summary>
    public string? Kind { get; set; }

    /// <summary>self | ally | enemy | neutral | object (null for an empty hex).</summary>
    public string? Side { get; set; }

    public string? Name { get; set; }
    public long? CharacterId { get; set; }
    public long? MapNpcId { get; set; }
    public int? Look { get; set; }

    /// <summary>1 Em pé, 2 Caído, 3 Fora de combate (characters and NPCs).</summary>
    public int? Posture { get; set; }

    public string? Status { get; set; }
    public int? CurrentLife { get; set; }
    public int? TotalLife { get; set; }
    public int? CurrentEnergy { get; set; }
    public int? TotalEnergy { get; set; }

    public bool IsEmptyHex => MapTokenId == null;

    public static TurnTarget Hex(int x, int y, int distance) => new() { X = x, Y = y, Distance = distance };

    /// <summary>A piece on the hex: the identity plus what the table shows of it right now.</summary>
    public static TurnTarget Piece(int x, int y, int distance, long mapTokenId, string kind, string side, string name,
        long? characterId = null, long? mapNpcId = null, int? look = null, int? posture = null, string? status = null,
        int? currentLife = null, int? totalLife = null, int? currentEnergy = null, int? totalEnergy = null) => new()
    {
        X = x, Y = y, Distance = distance, MapTokenId = mapTokenId, Kind = kind, Side = side, Name = name,
        CharacterId = characterId, MapNpcId = mapNpcId, Look = look, Posture = posture,
        Status = string.IsNullOrWhiteSpace(status) ? null : status.Trim(),
        CurrentLife = currentLife, TotalLife = totalLife, CurrentEnergy = currentEnergy, TotalEnergy = totalEnergy
    };

    public string? KindLabel() => Kind switch
    {
        KIND_CHARACTER => "personagem",
        KIND_NPC => "NPC",
        KIND_OBJECT => "objeto",
        _ => null
    };

    public string? SideLabel() => Side switch
    {
        SIDE_SELF => "si mesmo",
        SIDE_ALLY => "aliado",
        SIDE_ENEMY => "inimigo",
        SIDE_NEUTRAL => "neutro",
        SIDE_OBJECT => "objeto",
        _ => null
    };

    public string? PostureLabel() => Posture switch
    {
        1 => "Em pé",
        2 => "Caído",
        3 => "Fora de combate",
        _ => null
    };

    /// <summary>
    /// The target as the summary line and the turn data say it (not markdown-escaped): "o hex (9, 7), a 3 hexes",
    /// "si mesmo em (4, 4)" or "Goblin (inimigo, NPC) em (9, 7), a 3 hexes, olhando para o Sudeste, Caído, PV 5/12,
    /// Fadiga 3/10, status: "atordoado"" — posture only when not standing, vitals and status only when present.
    /// </summary>
    public string Describe()
    {
        var hexes = Distance == 1 ? "1 hex" : $"{Distance} hexes";
        if (IsEmptyHex)
            return $"o hex ({X}, {Y}), a {hexes}";
        if (Side == SIDE_SELF)
            return $"si mesmo em ({X}, {Y})";
        var parts = new List<string> { $"{Name} ({SideLabel()}, {KindLabel()}) em ({X}, {Y})", $"a {hexes}" };
        if (Look is int look)
            parts.Add($"olhando para o {TurnSummary.Direction(look)}");
        if (Posture is > 1 && PostureLabel() is string posture)
            parts.Add(posture);
        if (CurrentLife is int life && TotalLife is int totalLife)
            parts.Add($"PV {life}/{totalLife}");
        if (CurrentEnergy is int energy && TotalEnergy is int totalEnergy)
            parts.Add($"Fadiga {energy}/{totalEnergy}");
        if (Status != null)
            parts.Add($"status: \"{Status}\"");
        return string.Join(", ", parts);
    }
}
