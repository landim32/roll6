using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

/// <summary>
/// One entry of a campaign turn (016): a move (before/after position and facing), an action or an action
/// result (text). Belongs to exactly one character or NPC; NPC entries made from the map keep the occurrence
/// (<see cref="MapNpcId"/>) because each piece acts on its own.
/// </summary>
public class Turn
{
    public const int MAX_DESCRIPTION = 2000;

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
    public DateTime CreatedAt { get; set; }

    public static Turn Movement(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo,
        (int X, int Y, int Look) before, (int X, int Y, int Look) after)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, TurnType.Movement);
        turn.BeforeX = before.X;
        turn.BeforeY = before.Y;
        turn.BeforeLook = CheckLook(before.Look, "beforeLook");
        turn.X = after.X;
        turn.Y = after.Y;
        turn.Look = CheckLook(after.Look, "look");
        return turn;
    }

    public static Turn Action(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo, string? description)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, TurnType.Action);
        turn.Description = RequiredText(description);
        return turn;
    }

    public static Turn ActionResult(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo, string? description)
    {
        var turn = Create(campaignId, mapId, characterId, npcId, mapNpcId, turnNo, TurnType.ActionResult);
        turn.Description = RequiredText(description);
        return turn;
    }

    private static Turn Create(long campaignId, long? mapId, long? characterId, long? npcId, long? mapNpcId, int turnNo, TurnType type)
    {
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
