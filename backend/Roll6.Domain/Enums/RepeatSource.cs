namespace Roll6.Domain.Enums;

/// <summary>
/// How an action came from a repeated action (099). Both count as the actor's action of the turn; only a
/// <see cref="TurnStart"/> one is automatic, and a turn made only of those never hands itself to the GM mode (Q1 = B).
/// </summary>
public enum RepeatSource
{
    /// <summary>Recorded when the repetition was set, because the actor had not acted yet in the turn (Q2 = A).</summary>
    Declared = 1,

    /// <summary>Applied by the system when a new turn started.</summary>
    TurnStart = 2
}
