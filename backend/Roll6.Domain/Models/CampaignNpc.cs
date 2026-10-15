using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;

namespace Roll6.Domain.Models;

/// <summary>An NPC of the master's library made available in a campaign (once per campaign).</summary>
public class CampaignNpc
{
    public long CampaignNpcId { get; set; }
    public long CampaignId { get; set; }
    public long NpcId { get; set; }

    /// <summary>Enemy, neutral or ally in this campaign (071); every instance of the NPC in it follows it.</summary>
    public NpcCategory Category { get; set; } = NpcCategory.Enemy;

    /// <summary>
    /// The master character of an ally (071): an approved participation of the same campaign whose current owner commands
    /// the NPC's instances. Null = none; only allies have one.
    /// </summary>
    public long? MasterCampaignCharacterId { get; set; }

    public DateTime CreatedAt { get; set; }

    public static CampaignNpc Create(long campaignId, long npcId) => new()
    {
        CampaignId = campaignId,
        NpcId = npcId,
        Category = NpcCategory.Enemy,
        CreatedAt = DateTime.UtcNow
    };

    /// <summary>
    /// Sets the category and the master. Only an ally may have a master, and it must be an approved participation of this
    /// campaign. Returns whether anything changed.
    /// </summary>
    public bool Classify(int category, CampaignCharacter? master)
    {
        if (!Enum.IsDefined(typeof(NpcCategory), category))
            throw new DomainValidationException("category", "A categoria deve ser Inimigo (1), Neutro (2) ou Aliado (3).");
        var value = (NpcCategory)category;
        if (master != null && value != NpcCategory.Ally)
            throw new DomainValidationException("masterCampaignCharacterId", "Só aliados podem ter um personagem-mestre.");
        if (master != null && (master.CampaignId != CampaignId || master.Status != CampaignCharacterStatus.Approved))
            throw new DomainValidationException("masterCampaignCharacterId", "O personagem-mestre precisa estar aprovado nesta campanha.");
        var masterId = master?.CampaignCharacterId;
        if (Category == value && MasterCampaignCharacterId == masterId)
            return false;
        Category = value;
        MasterCampaignCharacterId = masterId;
        return true;
    }

    public void ClearMaster() => MasterCampaignCharacterId = null;
}
