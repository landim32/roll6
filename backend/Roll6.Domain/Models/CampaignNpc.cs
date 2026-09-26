namespace Roll6.Domain.Models;

/// <summary>An NPC of the master's library made available in a campaign (once per campaign).</summary>
public class CampaignNpc
{
    public long CampaignNpcId { get; set; }
    public long CampaignId { get; set; }
    public long NpcId { get; set; }
    public DateTime CreatedAt { get; set; }

    public static CampaignNpc Create(long campaignId, long npcId) => new()
    {
        CampaignId = campaignId,
        NpcId = npcId,
        CreatedAt = DateTime.UtcNow
    };
}
