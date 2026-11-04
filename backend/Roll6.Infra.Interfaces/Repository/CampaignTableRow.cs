namespace Roll6.Infra.Interfaces.Repository;

/// <summary>One row of the table combo: a campaign the user masters or plays.</summary>
public class CampaignTableRow
{
    public long CampaignId { get; set; }
    public long UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int Status { get; set; }
    public bool FreeMode { get; set; }
    public bool PendingNotice { get; set; } = true;
    public string? Image { get; set; }
}
