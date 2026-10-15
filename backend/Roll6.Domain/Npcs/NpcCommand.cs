using Roll6.Domain.Enums;
using Roll6.Domain.Models;

namespace Roll6.Domain.Npcs;

/// <summary>
/// Who commands an NPC instance (071): the campaign master always; otherwise the current owner of the approved master
/// character of an ally. Pure, so every case is unit-tested; <see cref="NpcCommandLoader"/> reads the rows.
/// </summary>
public static class NpcCommand
{
    /// <summary>The user id of the player commanding the NPC (never the campaign master), or null.</summary>
    public static long? CommanderUserId(CampaignNpc? campaignNpc, CampaignCharacter? master, Character? masterCharacter)
    {
        if (campaignNpc == null || campaignNpc.Category != NpcCategory.Ally || campaignNpc.MasterCampaignCharacterId is not long masterId)
            return null;
        if (master == null || master.CampaignCharacterId != masterId || master.CampaignId != campaignNpc.CampaignId
            || master.Status != CampaignCharacterStatus.Approved)
            return null;
        if (masterCharacter == null || masterCharacter.CharacterId != master.CharacterId)
            return null;
        return masterCharacter.UserId;
    }

    public static bool Commands(long userId, Campaign campaign, CampaignNpc? campaignNpc, CampaignCharacter? master, Character? masterCharacter) =>
        campaign.UserId == userId || CommanderUserId(campaignNpc, master, masterCharacter) == userId;
}
