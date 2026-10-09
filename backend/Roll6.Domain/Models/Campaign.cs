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

    /// <summary>The turn in which "Falta apenas você…" was already sent (043), so it goes once per turn.</summary>
    public int? MajorityNotifiedTurn { get; set; }
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
}
