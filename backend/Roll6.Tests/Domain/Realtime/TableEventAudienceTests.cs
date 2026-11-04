using FluentAssertions;
using Roll6.Domain.Realtime;
using Roll6.DTO.Realtime;

namespace Roll6.Tests.Domain.Realtime;

public class TableEventAudienceTests
{
    private const long MAP = 30;

    public static IEnumerable<object[]> MapTypes() => new[]
    {
        new object[] { TableEventType.MAP_TOKEN_UPSERTED },
        new object[] { TableEventType.MAP_TOKEN_DELETED },
        new object[] { TableEventType.MAP_TOKENS_CHANGED },
        new object[] { TableEventType.MAP_PAINT_CHANGED }
    };

    private static TableEventInfo Event(string type, long? mapId) => TableEvents.Create(type, 10, 1, mapId);

    [Theory]
    [MemberData(nameof(MapTypes))]
    public void EventOfOneMap_GoesToWhoIsOnThatMap(string type)
    {
        TableEventAudience.For(Event(type, MAP)).Should().Be(TableEventAudienceKind.Map);
    }

    [Theory]
    [MemberData(nameof(MapTypes))]
    public void ReloadOfEveryMap_GoesToEveryone(string type)
    {
        TableEventAudience.For(Event(type, null)).Should().Be(TableEventAudienceKind.Everyone);
    }

    [Theory]
    [InlineData(TableEventType.PARTY_CHANGED)]
    [InlineData(TableEventType.CHARACTER_MAP)]
    [InlineData(TableEventType.MAPS_CHANGED)]
    [InlineData(TableEventType.MAP_DELETED)]
    [InlineData(TableEventType.TURN_CHANGED)]
    [InlineData(TableEventType.MAP_SAVED)]
    public void OtherEvents_GoToEveryone(string type)
    {
        TableEventAudience.For(Event(type, MAP)).Should().Be(TableEventAudienceKind.Everyone);
    }

    [Fact]
    public void IsMapEvent_OnlyForPieceAndPaintEventsOfOneMap()
    {
        TableEventAudience.IsMapEvent(TableEventType.MAP_TOKEN_UPSERTED, MAP).Should().BeTrue();
        TableEventAudience.IsMapEvent(TableEventType.MAP_PAINT_CHANGED, MAP).Should().BeTrue();
        TableEventAudience.IsMapEvent(TableEventType.MAP_TOKENS_CHANGED, null).Should().BeFalse();
        TableEventAudience.IsMapEvent(TableEventType.PARTY_CHANGED, MAP).Should().BeFalse();
    }
}
