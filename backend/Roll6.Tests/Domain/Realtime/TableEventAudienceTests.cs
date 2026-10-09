using FluentAssertions;
using Roll6.Domain.Realtime;
using Roll6.DTO.Realtime;

namespace Roll6.Tests.Domain.Realtime;

public class TableEventAudienceTests
{
    private const long MAP = 30;

    public static IEnumerable<object[]> PieceTypes() => new[]
    {
        new object[] { TableEventType.MAP_TOKEN_UPSERTED },
        new object[] { TableEventType.MAP_TOKEN_DELETED },
        new object[] { TableEventType.MAP_TOKENS_CHANGED }
    };

    private static TableEventInfo Event(string type, long? mapId) => TableEvents.Create(type, 10, 1, mapId);

    [Theory]
    [MemberData(nameof(PieceTypes))]
    public void PieceEventOfAnotherMap_GoesOnlyToTheMaster(string type)
    {
        TableEventAudience.For(Event(type, MAP), currentMapId: 31).Should().Be(TableEventAudienceKind.MasterOnly);
        TableEventAudience.For(Event(type, MAP), currentMapId: null).Should().Be(TableEventAudienceKind.MasterOnly);
    }

    [Theory]
    [MemberData(nameof(PieceTypes))]
    public void PieceEventOfTheCurrentMap_GoesToEveryone(string type)
    {
        TableEventAudience.For(Event(type, MAP), currentMapId: MAP).Should().Be(TableEventAudienceKind.Everyone);
    }

    [Fact]
    public void ReloadOfEveryMap_GoesToEveryone()
    {
        TableEventAudience.For(Event(TableEventType.MAP_TOKENS_CHANGED, null), currentMapId: 31)
            .Should().Be(TableEventAudienceKind.Everyone);
    }

    [Theory]
    [InlineData(TableEventType.PARTY_CHANGED)]
    [InlineData(TableEventType.MAP_CURRENT)]
    [InlineData(TableEventType.MAPS_CHANGED)]
    [InlineData(TableEventType.TURN_CHANGED)]
    [InlineData(TableEventType.MAP_SAVED)]
    public void OtherEvents_GoToEveryone(string type)
    {
        TableEventAudience.For(Event(type, MAP), currentMapId: 31).Should().Be(TableEventAudienceKind.Everyone);
    }

    [Fact]
    public void NeedsCampaign_OnlyForPieceEventsOfOneMap()
    {
        TableEventAudience.NeedsCampaign(TableEventType.MAP_TOKEN_UPSERTED, MAP).Should().BeTrue();
        TableEventAudience.NeedsCampaign(TableEventType.MAP_TOKENS_CHANGED, null).Should().BeFalse();
        TableEventAudience.NeedsCampaign(TableEventType.PARTY_CHANGED, MAP).Should().BeFalse();
    }
}
