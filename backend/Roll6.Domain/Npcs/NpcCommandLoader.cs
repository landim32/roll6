using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Infra.Interfaces.Repository;

namespace Roll6.Domain.Npcs;

/// <summary>What the pieces of an NPC say about it in a campaign (071): its category and who commands it.</summary>
public sealed record NpcStanding(NpcCategory Category, long? CommanderUserId);

/// <summary>Reads the rows <see cref="NpcCommand"/> decides on: the campaign NPC, its master participation and character.</summary>
public sealed class NpcCommandLoader
{
    private readonly ICampaignNpcRepository<CampaignNpc> _campaignNpcRepository;
    private readonly ICampaignCharacterRepository<CampaignCharacter> _campaignCharacterRepository;
    private readonly ICharacterRepository<Character> _characterRepository;

    public NpcCommandLoader(
        ICampaignNpcRepository<CampaignNpc> campaignNpcRepository,
        ICampaignCharacterRepository<CampaignCharacter> campaignCharacterRepository,
        ICharacterRepository<Character> characterRepository)
    {
        _campaignNpcRepository = campaignNpcRepository;
        _campaignCharacterRepository = campaignCharacterRepository;
        _characterRepository = characterRepository;
    }

    /// <summary>Whether the user commands this NPC instance in the campaign (the master always does).</summary>
    public async Task<bool> CommandsAsync(long userId, Campaign campaign, long npcId)
    {
        if (campaign.UserId == userId)
            return true;
        var standing = await StandingAsync(campaign.CampaignId, new[] { npcId });
        return standing.TryGetValue(npcId, out var npc) && npc.CommanderUserId == userId;
    }

    /// <summary>Category and commander of each NPC in the campaign, in batch; NPCs not in the campaign are left out.</summary>
    public async Task<Dictionary<long, NpcStanding>> StandingAsync(long campaignId, IEnumerable<long> npcIds)
    {
        var campaignNpcs = await _campaignNpcRepository.ListByCampaignAndNpcsAsync(campaignId, npcIds) ?? new List<CampaignNpc>();
        var masterIds = campaignNpcs.Where(c => c.MasterCampaignCharacterId != null).Select(c => c.MasterCampaignCharacterId!.Value).Distinct().ToList();
        var masters = masterIds.Count == 0
            ? new Dictionary<long, CampaignCharacter>()
            : (await _campaignCharacterRepository.ListByIdsAsync(masterIds) ?? new List<CampaignCharacter>()).ToDictionary(p => p.CampaignCharacterId);
        var characterIds = masters.Values.Select(p => p.CharacterId).Distinct().ToList();
        var characters = characterIds.Count == 0
            ? new Dictionary<long, Character>()
            : (await _characterRepository.ListByIdsAsync(characterIds) ?? new List<Character>()).ToDictionary(c => c.CharacterId);

        var result = new Dictionary<long, NpcStanding>();
        foreach (var campaignNpc in campaignNpcs)
        {
            var master = campaignNpc.MasterCampaignCharacterId is long id ? masters.GetValueOrDefault(id) : null;
            var character = master != null ? characters.GetValueOrDefault(master.CharacterId) : null;
            result[campaignNpc.NpcId] = new NpcStanding(campaignNpc.Category, NpcCommand.CommanderUserId(campaignNpc, master, character));
        }
        return result;
    }
}
