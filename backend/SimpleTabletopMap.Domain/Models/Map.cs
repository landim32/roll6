using SimpleTabletopMap.Domain.Enums;
using SimpleTabletopMap.Domain.Exceptions;
using SimpleTabletopMap.Domain.Validation;

namespace SimpleTabletopMap.Domain.Models;

public class Map
{
    public long MapId { get; set; }
    public long CampaignId { get; set; }
    public long MapModelId { get; set; }
    public long UserId { get; set; }
    public int Sequence { get; set; }
    public string Name { get; set; } = string.Empty;
    public MapStatus Status { get; set; } = MapStatus.Active;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public bool IsDeleted => Status == MapStatus.Deleted;

    public void Update(string? name, int status)
    {
        EnsureNotDeleted();
        if (status != (int)MapStatus.Active && status != (int)MapStatus.Archived)
            throw new DomainValidationException("status", "O status deve ser 1 (Active) ou 2 (Archived).");
        Name = Guard.RequiredText(name, "name", 260);
        Status = (MapStatus)status;
        UpdatedAt = DateTime.UtcNow;
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
