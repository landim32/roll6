using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class CampaignNpcTests
{
    private static CampaignNpc Npc() => new() { CampaignNpcId = 5, CampaignId = 10, NpcId = 8 };

    private static CampaignCharacter Participation(long campaignId = 10, CampaignCharacterStatus status = CampaignCharacterStatus.Approved) =>
        new() { CampaignCharacterId = 70, CampaignId = campaignId, CharacterId = 80, Status = status };

    [Fact]
    public void New_IsAnEnemyWithoutMaster()
    {
        var npc = CampaignNpc.Create(10, 8);

        (npc.Category, npc.MasterCampaignCharacterId).Should().Be((NpcCategory.Enemy, (long?)null));
    }

    [Fact]
    public void Classify_AllyWithMaster_KeepsBoth()
    {
        var npc = Npc();

        npc.Classify(3, Participation()).Should().BeTrue();

        (npc.Category, npc.MasterCampaignCharacterId).Should().Be((NpcCategory.Ally, (long?)70));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(4)]
    public void Classify_UnknownCategory_Throws(int category)
    {
        var act = () => Npc().Classify(category, null);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("category");
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    public void Classify_MasterOnANonAlly_Throws(int category)
    {
        var act = () => Npc().Classify(category, Participation());

        act.Should().Throw<DomainValidationException>().Which.Errors["masterCampaignCharacterId"]
            .Should().Contain("Só aliados podem ter um personagem-mestre.");
    }

    [Fact]
    public void Classify_MasterOfAnotherCampaignOrNotApproved_Throws()
    {
        var other = () => Npc().Classify(3, Participation(campaignId: 11));
        var denied = () => Npc().Classify(3, Participation(status: CampaignCharacterStatus.Denied));

        other.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("masterCampaignCharacterId");
        denied.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("masterCampaignCharacterId");
    }

    [Fact]
    public void Classify_AllyBackToEnemy_ClearsTheMaster()
    {
        var npc = Npc();
        npc.Classify(3, Participation());

        npc.Classify(1, null).Should().BeTrue();

        (npc.Category, npc.MasterCampaignCharacterId).Should().Be((NpcCategory.Enemy, (long?)null));
    }

    [Fact]
    public void Classify_SameValues_ChangesNothing()
    {
        var npc = Npc();
        npc.Classify(3, Participation());

        npc.Classify(3, Participation()).Should().BeFalse();
        Npc().Classify(1, null).Should().BeFalse();
    }

    [Fact]
    public void ClearMaster_KeepsTheCategory()
    {
        var npc = Npc();
        npc.Classify(3, Participation());

        npc.ClearMaster();

        (npc.Category, npc.MasterCampaignCharacterId).Should().Be((NpcCategory.Ally, (long?)null));
    }
}
