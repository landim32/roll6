namespace Roll6.Domain.Enums;

/// <summary>Where a question to the master's Claude stands (093).</summary>
public enum AskState
{
    Waiting = 1,
    Answered = 2,
    Failed = 3
}
