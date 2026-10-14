namespace Roll6.Domain.Enums;

/// <summary>
/// What a library animation (059) shows. Only three feed a token's animation states for now (Q2): Idle → "Parado",
/// Walk → "Caminhando", Defeated → "Caído". The others are stored for states to come.
/// </summary>
public enum AnimationType
{
    /// <summary>"Parado".</summary>
    Idle = 1,
    /// <summary>"Andando".</summary>
    Walk = 2,
    /// <summary>"Correndo".</summary>
    Run = 3,
    /// <summary>"Agachado".</summary>
    Crouch = 4,
    /// <summary>"Derrotado".</summary>
    Defeated = 5,
    /// <summary>"Atacando".</summary>
    Attack = 6,
    /// <summary>"Defendendo".</summary>
    Defend = 7
}
