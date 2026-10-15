using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

public class Campaign
{
    public long CampaignId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Unique URL slug. Assigned only on insert (<see cref="AssignSlug"/>); <see cref="Rename"/> never changes it.
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>Open campaigns approve access requests immediately; closed ones need the master.</summary>
    public bool Open { get; set; }

    /// <summary>Current turn of the campaign (016), starting at 1.</summary>
    public int CurrentTurn { get; set; } = 1;

    /// <summary>Campaign map the master opened last (017): players follow it. Null when there is none.</summary>
    public long? CurrentMapId { get; set; }

    /// <summary>
    /// Status (049). The model default is <see cref="CampaignStatus.Active"/> (what every campaign was before 049);
    /// <c>CampaignService.CreateAsync</c> starts new campaigns as <see cref="CampaignStatus.Preparing"/>.
    /// </summary>
    public CampaignStatus Status { get; set; } = CampaignStatus.Active;

    /// <summary>The turn in which "Falta apenas você…" was already sent (043), so it goes once per turn.</summary>
    public int? MajorityNotifiedTurn { get; set; }

    /// <summary>
    /// Free mode (054): while on, character and NPC pieces move any number of times without the Deslocamento limit and without a Movement entry, the turn
    /// finishes without a pending list and no majority notice goes out. Switching it never touches the turn. Actions
    /// stay one per actor and turn (073 removed the 054 exception).
    /// </summary>
    public bool FreeMode { get; set; }

    /// <summary>
    /// The notice over the chat (072): the blinking pictures of the characters that still owe their play this turn.
    /// On by default; the master switches it in any status, and with it on it shows in free mode too.
    /// </summary>
    public bool PendingNotice { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public void Rename(string? name)
    {
        Name = Guard.RequiredText(name, "name", 260);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Sets the slug. Called only when the campaign is inserted.</summary>
    public void AssignSlug(string slug)
    {
        Slug = slug;
    }

    /// <summary>Finishes the current turn: the next one starts.</summary>
    public void AdvanceTurn()
    {
        CurrentTurn++;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Sets the turn in progress directly (030, master fixing the turn log).</summary>
    public void SetCurrentTurn(int turnNo)
    {
        if (turnNo < 1)
            throw new DomainValidationException("turnNo", "O turno deve ser maior que zero.");
        CurrentTurn = turnNo;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Sets (or clears) the map the table follows.</summary>
    public void SetCurrentMap(long? mapId)
    {
        CurrentMapId = mapId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetOpen(bool open)
    {
        Open = open;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Switches the free mode (054; master only, checked by the service, allowed in any status).</summary>
    public void SetFreeMode(bool freeMode)
    {
        FreeMode = freeMode;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Switches the pending notice over the chat (072; master only, checked by the service).</summary>
    public void SetPendingNotice(bool pendingNotice)
    {
        PendingNotice = pendingNotice;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Changes the status (master only, checked by the service).</summary>
    public void SetStatus(int status)
    {
        if (!Enum.IsDefined(typeof(CampaignStatus), status))
            throw new DomainValidationException("status", "Status inválido.");
        Status = (CampaignStatus)status;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>The status as it reads in "A campanha está …".</summary>
    public string StatusLabel => Status switch
    {
        CampaignStatus.Preparing => "em preparação",
        CampaignStatus.Paused => "pausada",
        CampaignStatus.Finished => "finalizada",
        _ => "ativa"
    };

    /// <summary>The turn, actions and new characters only move while the campaign is active (049).</summary>
    public void EnsurePlayable()
    {
        if (Status != CampaignStatus.Active)
            throw new ConflictException($"A campanha está {StatusLabel}.");
    }

    /// <summary>
    /// Pieces, NPC occurrences and maps of the campaign change while it is active — and, while it is being prepared,
    /// only by the master (049).
    /// </summary>
    public void EnsureMapEditable(bool isMaster)
    {
        if (Status == CampaignStatus.Active || (Status == CampaignStatus.Preparing && isMaster))
            return;
        throw new ConflictException($"A campanha está {StatusLabel}.");
    }
}
