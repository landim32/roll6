using System.Globalization;
using Roll6.Domain.Enums;

namespace Roll6.Domain.Animations;

/// <summary>
/// How library animations (059) meet a token's animation states. A state's choice <c>animation:{id}</c> names an
/// animation, and each state accepts only one type for now (Q2): Parado ← Idle, Caminhando ← Walk, Caído ← Defeated.
/// Pure.
/// </summary>
public static class AnimationStates
{
    public const string CHOICE_PREFIX = "animation:";
    public const string IDLE_FIELD = "modelIdleClip";
    public const string WALK_FIELD = "modelWalkClip";
    public const string DOWN_FIELD = "modelDownClip";

    /// <summary>The id of an <c>animation:{id}</c> choice (a positive integer), or null for any other value.</summary>
    public static long? ParseChoice(string? choice)
    {
        if (choice == null || !choice.StartsWith(CHOICE_PREFIX, StringComparison.Ordinal))
            return null;
        var digits = choice[CHOICE_PREFIX.Length..];
        if (digits.Length == 0 || !digits.All(char.IsAsciiDigit))
            return null;
        return long.TryParse(digits, NumberStyles.None, CultureInfo.InvariantCulture, out var id) && id > 0 ? id : null;
    }

    /// <summary>The choice that names an animation.</summary>
    public static string Choice(long animationId) => CHOICE_PREFIX + animationId.ToString(CultureInfo.InvariantCulture);

    /// <summary>The type a token state's field accepts.</summary>
    public static AnimationType TypeFor(string field) => field switch
    {
        IDLE_FIELD => AnimationType.Idle,
        WALK_FIELD => AnimationType.Walk,
        DOWN_FIELD => AnimationType.Defeated,
        _ => throw new ArgumentOutOfRangeException(nameof(field), field, null),
    };

    /// <summary>The token state field an animation type feeds, or null for the types no state uses yet.</summary>
    public static string? FieldOf(AnimationType type) => type switch
    {
        AnimationType.Idle => IDLE_FIELD,
        AnimationType.Walk => WALK_FIELD,
        AnimationType.Defeated => DOWN_FIELD,
        _ => null,
    };

    /// <summary>The label of a type, in pt-BR (messages).</summary>
    public static string TypeLabel(AnimationType type) => type switch
    {
        AnimationType.Idle => "Parado",
        AnimationType.Walk => "Andando",
        AnimationType.Run => "Correndo",
        AnimationType.Crouch => "Agachado",
        AnimationType.Defeated => "Derrotado",
        AnimationType.Attack => "Atacando",
        AnimationType.Defend => "Defendendo",
        _ => type.ToString(),
    };

    /// <summary>The label of a token state, in pt-BR (messages).</summary>
    public static string StateLabel(string field) => field switch
    {
        IDLE_FIELD => "Parado",
        WALK_FIELD => "Caminhando",
        DOWN_FIELD => "Caído",
        _ => field,
    };
}
