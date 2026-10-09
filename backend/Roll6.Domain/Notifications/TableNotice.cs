namespace Roll6.Domain.Notifications;

/// <summary>What a notice is about (043): the catalog N1–N7 of the spec.</summary>
public enum NoticeKind
{
    /// <summary>N1: a message in the chat (text, photo, audio, roll, narration) — everyone but the author.</summary>
    Message = 1,
    /// <summary>N2: a character's action — the master only.</summary>
    Action = 2,
    /// <summary>N3: "Falta apenas você…" — the players who still have to act.</summary>
    Majority = 3,
    /// <summary>N4: "Turno N terminado. Pode agir novamente" — the players.</summary>
    TurnFinished = 4,
    /// <summary>N5: "Você está com -3/13 PV" — the character's owner.</summary>
    Life = 5,
    /// <summary>N6: "Você está com 5/11 de Fadiga" — the character's owner.</summary>
    Fatigue = 6,
    /// <summary>N7: "Rodrigo está cutucando você" — the poked players.</summary>
    Poke = 7
}

/// <summary>
/// A notice to deliver (043), enqueued by the domain service that owns the event right after its write succeeds and
/// delivered in the background (push, or an in-app toast when the campaign is on screen).
/// </summary>
public sealed record TableNotice
{
    public required NoticeKind Kind { get; init; }
    public required long CampaignId { get; init; }
    /// <summary>Who caused it: never notified.</summary>
    public required long ActorUserId { get; init; }
    /// <summary>Who speaks/acts ("Aria", "Mestre (GM) — Rodrigo"); the title becomes "{Speaker} · {campaign}". Null = campaign only.</summary>
    public string? Speaker { get; init; }
    public required string Body { get; init; }
    /// <summary>Per recipient body (N3: each player's list of who else is missing); falls back to <see cref="Body"/>.</summary>
    public IReadOnlyDictionary<long, string>? BodyByUser { get; init; }
    public string? IconUrl { get; init; }
    /// <summary>Recipients; null = every participant of the campaign (master and owners of approved characters).</summary>
    public IReadOnlyCollection<long>? TargetUserIds { get; init; }

    /// <summary>N1/N2 are skipped for whoever has the campaign's chat on screen; N3–N7 become an in-app toast there.</summary>
    public bool IsPersonal => Kind is not (NoticeKind.Message or NoticeKind.Action);

    public string BodyFor(long userId) => BodyByUser != null && BodyByUser.TryGetValue(userId, out var body) ? body : Body;
}
