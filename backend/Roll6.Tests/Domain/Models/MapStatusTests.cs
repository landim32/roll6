using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

/// <summary>108: a map is only active or archived (or deleted).</summary>
public class MapStatusTests
{
    private static Map MapIn(MapStatus status) => new() { MapId = 1, CampaignId = 10, Name = "A", Status = status };

    [Fact]
    public void Update_RefusesTheFormerCurrentStatus()
    {
        FluentActions.Invoking(() => MapIn(MapStatus.Active).Update("A", 4)).Should().Throw<DomainValidationException>()
            .Which.Errors.Should().ContainKey("status");
    }

    [Fact]
    public void Update_ArchivesAndReactivates()
    {
        var map = MapIn(MapStatus.Active);

        map.Update("Novo nome", 2);
        (map.Status, map.Name).Should().Be((MapStatus.Archived, "Novo nome"));

        map.Update("Novo nome", 1);
        map.Status.Should().Be(MapStatus.Active);
    }

    [Fact]
    public void Status_HasNoCurrentValue()
    {
        Enum.GetValues<MapStatus>().Should().Equal(MapStatus.Active, MapStatus.Archived, MapStatus.Deleted);
    }
}
