using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Models;

namespace Roll6.Tests.Domain.Models;

public class MapTokenTests
{
    [Fact]
    public void PlaceCharacter_IsALinkedCharacterToken()
    {
        var mapToken = MapToken.PlaceCharacter(30, 5, 7, "Aria", 3, 2);

        mapToken.TokenType.Should().Be(MapTokenType.Character);
        mapToken.CampaignCharacterId.Should().Be(7);
        mapToken.TokenId.Should().Be(5);
        mapToken.Name.Should().Be("Aria");
        (mapToken.X, mapToken.Y, mapToken.Look).Should().Be((3, 2, 0));
    }

    [Fact]
    public void Update_CharacterWithoutParticipation_Throws()
    {
        var act = () => new MapToken().Update("Aria", (int)MapTokenType.Character, null, 0, 0, null, 0, 0, 0, 0);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("campaignCharacterId");
    }

    [Fact]
    public void Update_NpcWithParticipation_Throws()
    {
        var act = () => new MapToken { CampaignCharacterId = 7 }.Update("Goblin", (int)MapTokenType.Npc, null, 0, 0, null, 0, 0, 0, 0);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("campaignCharacterId");
    }

    [Fact]
    public void ChangeToken_KeepsPositionFacingTypeAndLink()
    {
        var mapToken = MapToken.PlaceCharacter(30, 5, 7, "Aria", 3, 2);
        mapToken.Look = 4;

        mapToken.ChangeToken(9);

        mapToken.TokenId.Should().Be(9);
        (mapToken.X, mapToken.Y, mapToken.Look).Should().Be((3, 2, 4));
        mapToken.TokenType.Should().Be(MapTokenType.Character);
        mapToken.CampaignCharacterId.Should().Be(7);
    }

    [Fact]
    public void PlaceNpc_IsALinkedNpcPiece()
    {
        var mapToken = MapToken.PlaceNpc(30, 5, 90, "Goblin", 2, 3, 1);

        mapToken.TokenType.Should().Be(MapTokenType.Npc);
        mapToken.MapNpcId.Should().Be(90);
        (mapToken.X, mapToken.Y, mapToken.Look).Should().Be((2, 3, 1));
    }

    [Fact]
    public void Update_NpcPieceWithAnotherType_Throws()
    {
        var act = () => new MapToken { MapNpcId = 90 }.Update("Goblin", (int)MapTokenType.Object, null, 0, 0, null, 0, 0, 0, 0);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("mapNpcId");
    }

    [Fact]
    public void Update_NpcWithoutOccurrence_Throws()
    {
        var act = () => new MapToken().Update("Goblin", (int)MapTokenType.Npc, null, 0, 0, null, 0, 0, 0, 0);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("mapNpcId");
    }

    [Theory]
    [InlineData(3)]
    [InlineData(5)]
    public void Update_UnknownType_Throws(int tokenType)
    {
        var act = () => new MapToken().Update("Pedra", tokenType, null, 0, 0, null, 0, 0, 0, 0);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("tokenType");
    }
}
