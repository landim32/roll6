using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Validation;

namespace Roll6.Domain.Models;

public class Map
{
    public long MapId { get; set; }
    public long CampaignId { get; set; }
    public long MapModelId { get; set; }
    public long UserId { get; set; }
    public int Sequence { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Unique URL slug. Assigned only on insert (<see cref="AssignSlug"/>); <see cref="Update"/> never changes it.
    /// Deleted maps keep the slug.
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    public MapStatus Status { get; set; } = MapStatus.Active;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted => Status == MapStatus.Deleted;

    public bool IsCurrent => Status == MapStatus.Current;

    /// <summary>Active or Current (078): a map the table can play on.</summary>
    public bool IsPlayable => Status is MapStatus.Active or MapStatus.Current;

    public const string USE_MAKE_CURRENT = "Use “Tornar atual” para tornar um mapa atual.";
    public const string ARCHIVE_CURRENT = "Torne outro mapa atual antes de arquivar este.";

    /// <summary>
    /// Renames and archives/reactivates (1 Active, 2 Archived). 078: the Current map is made only by "Tornar atual", so
    /// status 4 is refused, archiving the Current map is refused, and "Active" on the Current map keeps it Current.
    /// </summary>
    public void Update(string? name, int status)
    {
        EnsureNotDeleted();
        if (status == (int)MapStatus.Current)
            throw new DomainValidationException("status", USE_MAKE_CURRENT);
        if (status != (int)MapStatus.Active && status != (int)MapStatus.Archived)
            throw new DomainValidationException("status", "O status deve ser 1 (Active) ou 2 (Archived).");
        if (IsCurrent && status == (int)MapStatus.Archived)
            throw new DomainValidationException("status", ARCHIVE_CURRENT);
        Name = Guard.RequiredText(name, "name", 260);
        if (!IsCurrent)
            Status = (MapStatus)status;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Becomes the map the players follow (078; only from Active, by <c>SetCurrentMapAsync</c>).</summary>
    public void MakeCurrent()
    {
        if (IsCurrent)
            return;
        if (Status != MapStatus.Active)
            throw new DomainValidationException("mapId", "O mapa precisa ser um mapa ativo desta campanha.");
        Status = MapStatus.Current;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Another map became the current one (078): back to Active.</summary>
    public void LeaveCurrent()
    {
        if (!IsCurrent)
            return;
        Status = MapStatus.Active;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>Sets the slug. Called only when the map is inserted.</summary>
    public void AssignSlug(string slug)
    {
        Slug = slug;
    }

    public void MarkDeleted()
    {
        EnsureNotDeleted();
        Status = MapStatus.Deleted;
        UpdatedAt = DateTime.UtcNow;
    }

    public void EnsureNotDeleted()
    {
        if (IsDeleted)
            throw new KeyNotFoundException("Mapa não encontrado.");
    }
}
