using SimpleTabletopMap.Domain.Validation;

namespace SimpleTabletopMap.Domain.Models;

public class Campaign
{
    public long CampaignId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>Open campaigns approve access requests immediately; closed ones need the master.</summary>
    public bool Open { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public void Rename(string? name)
    {
        Name = Guard.RequiredText(name, "name", 260);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetOpen(bool open)
    {
        Open = open;
        UpdatedAt = DateTime.UtcNow;
    }
}
