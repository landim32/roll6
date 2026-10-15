using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Models;
using Roll6.Domain.Npcs;

namespace Roll6.Tests.Domain.Npcs;

public class NpcCommandTests
{
    private const long MASTER = 1;
    private const long PLAYER = 2;
    private const long STRANGER = 3;

    private static readonly Campaign Campaign = new() { CampaignId = 10, UserId = MASTER, Name = "C" };

    private static CampaignNpc Ally(long? master = 70, NpcCategory category = NpcCategory.Ally) =>
        new() { CampaignNpcId = 5, CampaignId = 10, NpcId = 8, Category = category, MasterCampaignCharacterId = master };

    private static CampaignCharacter Participation(CampaignCharacterStatus status = CampaignCharacterStatus.Approved) =>
        new() { CampaignCharacterId = 70, CampaignId = 10, CharacterId = 80, Status = status };

    private static Character Aria(long owner = PLAYER) => new() { CharacterId = 80, UserId = owner, Name = "Aria" };

    [Fact]
    public void TheMasterAlwaysCommands()
    {
        NpcCommand.Commands(MASTER, Campaign, null, null, null).Should().BeTrue();
        NpcCommand.Commands(MASTER, Campaign, Ally(category: NpcCategory.Enemy), null, null).Should().BeTrue();
    }

    [Fact]
    public void TheOwnerOfTheApprovedMasterCommandsTheAlly()
    {
        NpcCommand.Commands(PLAYER, Campaign, Ally(), Participation(), Aria()).Should().BeTrue();
        NpcCommand.CommanderUserId(Ally(), Participation(), Aria()).Should().Be(PLAYER);
    }

    [Fact]
    public void NobodyElseCommands()
    {
        NpcCommand.Commands(STRANGER, Campaign, Ally(), Participation(), Aria()).Should().BeFalse();
        NpcCommand.Commands(PLAYER, Campaign, Ally(category: NpcCategory.Neutral), Participation(), Aria()).Should().BeFalse();
        NpcCommand.Commands(PLAYER, Campaign, Ally(master: null), Participation(), Aria()).Should().BeFalse();
        NpcCommand.Commands(PLAYER, Campaign, Ally(), Participation(CampaignCharacterStatus.Denied), Aria()).Should().BeFalse();
        NpcCommand.Commands(PLAYER, Campaign, Ally(master: 71), Participation(), Aria()).Should().BeFalse();
        NpcCommand.Commands(PLAYER, Campaign, null, null, null).Should().BeFalse();
    }

    [Fact]
    public void TheCommandFollowsTheCurrentOwner()
    {
        // Transferred character (021): the new owner commands, the former one no longer does.
        NpcCommand.CommanderUserId(Ally(), Participation(), Aria(owner: STRANGER)).Should().Be(STRANGER);
        NpcCommand.Commands(PLAYER, Campaign, Ally(), Participation(), Aria(owner: STRANGER)).Should().BeFalse();
    }
}
