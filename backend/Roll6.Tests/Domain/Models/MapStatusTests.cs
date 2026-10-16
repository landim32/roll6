using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

/// <summary>078: "Atual" is a map status, made only by "Tornar atual".</summary>
public class MapStatusTests
{
    private static Map MapIn(MapStatus status) => new() { MapId = 1, CampaignId = 10, Name = "A", Status = status };

    [Theory]
    [InlineData(MapStatus.Active, true)]
    [InlineData(MapStatus.Current, true)]
    [InlineData(MapStatus.Archived, false)]
    [InlineData(MapStatus.Deleted, false)]
    public void IsPlayable_ActiveOrCurrent(MapStatus status, bool playable) => MapIn(status).IsPlayable.Should().Be(playable);

    [Fact]
    public void Update_RefusesStatusCurrent_AndArchivingTheCurrentMap()
    {
        FluentActions.Invoking(() => MapIn(MapStatus.Active).Update("A", 4)).Should().Throw<DomainValidationException>()
            .Which.Errors["status"].Should().Contain(Map.USE_MAKE_CURRENT);
        FluentActions.Invoking(() => MapIn(MapStatus.Current).Update("A", 2)).Should().Throw<DomainValidationException>()
            .Which.Errors["status"].Should().Contain(Map.ARCHIVE_CURRENT);
    }

    [Fact]
    public void Update_Active_KeepsTheCurrentMapCurrent_AndStillArchivesOthers()
    {
        var current = MapIn(MapStatus.Current);
        current.Update("Novo nome", 1);
        (current.Status, current.Name).Should().Be((MapStatus.Current, "Novo nome"));

        var active = MapIn(MapStatus.Active);
        active.Update("A", 2);
        active.Status.Should().Be(MapStatus.Archived);
    }

    [Fact]
    public void MakeCurrent_OnlyFromActive_AndLeaveCurrentGoesBackToActive()
    {
        var map = MapIn(MapStatus.Active);
        map.MakeCurrent();
        map.Status.Should().Be(MapStatus.Current);
        map.LeaveCurrent();
        map.Status.Should().Be(MapStatus.Active);
        FluentActions.Invoking(() => MapIn(MapStatus.Archived).MakeCurrent()).Should().Throw<DomainValidationException>();
    }
}
