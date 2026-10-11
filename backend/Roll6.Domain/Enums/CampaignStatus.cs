namespace Roll6.Domain.Enums;

/// <summary>
/// Status of a campaign (049). Only <see cref="Active"/> plays: outside it the turn, the pieces and new characters are
/// frozen (the master still builds maps while <see cref="Preparing"/>), and only the conversation chat keeps going.
/// </summary>
public enum CampaignStatus
{
    /// <summary>"Preparando" — new campaigns start here.</summary>
    Preparing = 1,

    /// <summary>"Ativa".</summary>
    Active = 2,

    /// <summary>"Pausada".</summary>
    Paused = 3,

    /// <summary>"Finalizada".</summary>
    Finished = 4
}
