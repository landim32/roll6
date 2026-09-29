using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// One entry of a campaign turn (016): a move (before/after position and facing, movement points spent), an
/// action or an action result (text), or a character/NPC change (024, list of fields before/after). Belongs to
/// exactly one character or NPC; NPC entries made from the map keep the occurrence (<see cref="MapNpcId"/>)
/// because each piece acts on its own. <see cref="UserId"/> is who made it (the master or the character owner).
/// </summary>
public class Turn
{
    public const int MAX_DESCRIPTION = 2000;

    /// <summary>A turn narration is longer than an action (027).</summary>
    public const int MAX_NARRATION = 10000;

    public long TurnId { get; set; }
    public long CampaignId { get; set; }
    public long? MapId { get; set; }
    public long? CharacterId { get; set; }
    public long? NpcId { get; set; }
    public long? MapNpcId { get; set; }
    public int TurnNo { get; set; }
    public TurnType TurnType { get; set; }
    public int? BeforeX { get; set; }
    public int? BeforeY { get; set; }
    public int? BeforeLook { get; set; }
    public int? X { get; set; }
    public int? Y { get; set; }
    public int? Look { get; set; }
    public string? Description { get; set; }

    /// <summary>Who made the entry (required, 024).</summary>
    public long UserId { get; set; }

    /// <summary>Movement points spent by a move (024).</summary>
    public int? Moved { get; set; }

    /// <summary>Fields changed by a CharacterUpdate (024).</summary>
    public List<TurnChange>? Changes { get; set; }

    public DateTime CreatedAt { get; set; }

    public static Turn Movement(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, (int X, int Y, int Look) before, (int X, int Y, int Look) after, int? moved = null)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, TurnType.Movement);
        if (moved < 0)
            throw new DomainValidationException("moved", "Os pontos de movimento não podem ser negativos.");
        turn.Moved = moved;
        turn.BeforeX = before.X;
        turn.BeforeY = before.Y;
        turn.BeforeLook = CheckLook(before.Look, "beforeLook");
        turn.X = after.X;
        turn.Y = after.Y;
        turn.Look = CheckLook(after.Look, "look");
        return turn;
    }

    public static Turn Action(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, string? description)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, TurnType.Action);
        turn.Description = RequiredText(description);
        return turn;
    }

    public static Turn ActionResult(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, string? description)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, TurnType.ActionResult);
        turn.Description = RequiredText(description);
        return turn;
    }

    /// <summary>A change to a character/NPC during the turn (024); only built when something changed.</summary>
    public static Turn CharacterUpdate(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, IReadOnlyCollection<TurnChange> changes)
    {
        CheckChanges(changes);
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, userId, TurnType.CharacterUpdate);
        turn.Changes = changes.ToList();
        return turn;
    }

    /// <summary>What happened in the whole turn (027): written by the master when the turn is processed, no actor.</summary>
    public static Turn Narration(long campaignId, long? mapId, int turnNo, long userId, string? text)
    {
        if (userId <= 0)
            throw new DomainValidationException("userId", "Informe quem fez o registro.");
        if (turnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        return new Turn
        {
            CampaignId = campaignId,
            MapId = mapId,
            TurnNo = turnNo,
            TurnType = TurnType.Narration,
            UserId = userId,
            Description = Guard.RequiredText(text, "narration", MAX_NARRATION),
            CreatedAt = DateTime.UtcNow
        };
    }

    /// <summary>Entries can only go to a turn that already started (030).</summary>
    public static void EnsureTurnInRange(int turnNo, int currentTurn)
    {
        if (turnNo < 1 || turnNo > currentTurn)
            throw new DomainValidationException("turnNo", $"O turno deve estar entre 1 e o turno atual ({currentTurn}).");
    }

    // --- Changes made by the master (030): type, actor, author and creation date never change. ---

    public void MoveToTurn(int turnNo, int currentTurn)
    {
        EnsureTurnInRange(turnNo, currentTurn);
        TurnNo = turnNo;
    }

    public void ChangeMap(long mapId)
    {
        MapId = mapId;
    }

    /// <summary>Text of an action, action result or narration.</summary>
    public void ChangeText(string? text)
    {
        Description = TurnType switch
        {
            TurnType.Action or TurnType.ActionResult => RequiredText(text),
            TurnType.Narration => Guard.RequiredText(text, "description", MAX_NARRATION),
            _ => throw NotForType("description")
        };
    }

    /// <summary>Positions, facings and points of a move; only the given values change.</summary>
    public void ChangeMovement(int? beforeX, int? beforeY, int? beforeLook, int? x, int? y, int? look, int? moved)
    {
        if (TurnType != TurnType.Movement)
        {
            var field = new (string Name, int? Value)[]
            {
                ("beforeX", beforeX), ("beforeY", beforeY), ("beforeLook", beforeLook), ("x", x), ("y", y), ("look", look), ("moved", moved)
            }.First(f => f.Value.HasValue).Name;
            throw NotForType(field);
        }
        if (moved < 0)
            throw new DomainValidationException("moved", "Os pontos de movimento não podem ser negativos.");
        if (beforeLook.HasValue) BeforeLook = CheckLook(beforeLook.Value, "beforeLook");
        if (look.HasValue) Look = CheckLook(look.Value, "look");
        if (beforeX.HasValue) BeforeX = beforeX;
        if (beforeY.HasValue) BeforeY = beforeY;
        if (x.HasValue) X = x;
        if (y.HasValue) Y = y;
        if (moved.HasValue) Moved = moved;
    }

    /// <summary>Replaces the fields listed by a character/NPC change.</summary>
    public void ChangeChanges(IReadOnlyCollection<TurnChange> changes)
    {
        if (TurnType != TurnType.CharacterUpdate)
            throw NotForType("changes");
        CheckChanges(changes);
        Changes = changes.ToList();
    }

    private static void CheckChanges(IReadOnlyCollection<TurnChange> changes)
    {
        if (changes.Count == 0)
            throw new DomainValidationException("changes", "Nenhuma alteração para registrar.");
        if (changes.Any(c => string.IsNullOrWhiteSpace(c.Field)))
            throw new DomainValidationException("changes", "Informe o campo de cada alteração.");
    }

    private static DomainValidationException NotForType(string field) =>
        new(field, "Este campo não vale para este tipo de registro.");

    private static Turn Create(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        long userId, TurnType type)
    {
        if (userId <= 0)
            throw new DomainValidationException("userId", "Informe quem fez o registro.");
        if (characterId.HasValue == npcId.HasValue)
            throw new DomainValidationException("characterId", "Informe um personagem ou um NPC.");
        if (mapNpcId.HasValue && !npcId.HasValue)
            throw new DomainValidationException("mapNpcId", "A ocorrência só vale para NPCs.");
        if (turnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        return new Turn
        {
            CampaignId = campaignId,
            MapId = mapId,
            CharacterId = characterId,
            NpcId = npcId,
            MapNpcId = mapNpcId,
            TurnNo = turnNo,
            TurnType = type,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static string RequiredText(string? description) =>
        Guard.RequiredText(description, "description", MAX_DESCRIPTION);

    private static int CheckLook(int look, string field)
    {
        if (look < 0 || look > MapToken.MAX_LOOK)
            throw new DomainValidationException(field, $"O sentido deve estar entre 0 e {MapToken.MAX_LOOK}.");
        return look;
    }
}
