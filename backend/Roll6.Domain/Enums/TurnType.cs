namespace Roll6.Domain.Enums;

/// <summary>
/// What a turn entry records: a move, an action (text), an action result (text, API only) or a change to a
/// character/NPC made during the turn (024, created by the system only).
/// </summary>
public enum TurnType
{
    Movement = 1,
    Action = 2,
    ActionResult = 3,
    CharacterUpdate = 4,
    /// <summary>What happened in the turn, written when the turn is processed (027); no character/NPC.</summary>
    Narration = 5
}
