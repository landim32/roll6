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
        if (changes.Count == 0)
            throw new DomainValidationException("changes", "Nenhuma alteração para registrar.");
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
