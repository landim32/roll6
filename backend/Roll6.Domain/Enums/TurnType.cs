namespace Roll6.Domain.Enums;

/// <summary>
/// What an entry of the campaign's timeline records (041: the turn log and the chat are one thing). 1–5 are the turn
/// records — a move, an action (text), an action result (text, API only), a change to a character/NPC made during the
/// turn (024, created by the system only) and a narration; 6–8 are what people say in the chat; 9 marks the end of a
/// turn. Every rule and read of the turn (summary, data, history, pending actions…) looks only at
/// <see cref="TurnTypes.LOG"/>.
/// </summary>
public enum TurnType
{
    Movement = 1,
    Action = 2,
    ActionResult = 3,
    CharacterUpdate = 4,
    /// <summary>What happened in the turn, written when the turn is processed (027); no character/NPC.</summary>
    Narration = 5,
    /// <summary>A chat message in text (041).</summary>
    Text = 6,
    /// <summary>A chat message with a photo (041), optional caption in the description.</summary>
    Image = 7,
    /// <summary>A chat message with a recorded audio (041), optional caption in the description.</summary>
    Audio = 8,
    /// <summary>"Turno N finalizado" (041): written where the turn advances; <c>TurnNo</c> is the finished turn.</summary>
    TurnFinished = 9
}

/// <summary>Groups of <see cref="TurnType"/> (041).</summary>
public static class TurnTypes
{
    /// <summary>The turn records: what the turn rules and the turn reads (and the AI tools) consider.</summary>
    public static readonly TurnType[] LOG =
        { TurnType.Movement, TurnType.Action, TurnType.ActionResult, TurnType.CharacterUpdate, TurnType.Narration };

    /// <summary>What people say in the chat.</summary>
    public static readonly TurnType[] CONVERSATION = { TurnType.Text, TurnType.Image, TurnType.Audio };

    public static bool IsLog(TurnType type) => type is >= TurnType.Movement and <= TurnType.Narration;

    public static bool IsConversation(TurnType type) => type is TurnType.Text or TurnType.Image or TurnType.Audio;
}
