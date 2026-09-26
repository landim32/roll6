namespace Roll6.Domain.Enums;

/// <summary>What a turn entry records: a move, an action (text) or an action result (text, API only).</summary>
public enum TurnType
{
    Movement = 1,
    Action = 2,
    ActionResult = 3
}
