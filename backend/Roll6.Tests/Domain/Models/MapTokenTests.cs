using FluentAssertions;
using Roll6.Domain.Enums;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Grid;
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

    // 070: the exact point of a 3D walk inside the hex.

    [Fact]
    public void WalkTo_PointInsideTheHex_KeepsItAndNormalizesTheYaw()
    {
        var piece = new MapToken();
        piece.MoveTo(4, 4);

        piece.WalkTo(285.5, 315.25, 2 * Math.PI + 0.5);

        (piece.WalkX, piece.WalkY).Should().Be((285.5, 315.25));
        piece.WalkYaw.Should().BeApproximately(0.5, 1e-9);
        HexGrid.PixelToHex(285.5, 315.25, HexGrid.HEX_SIZE).Should().Be((4, 4));
    }

    [Theory]
    [InlineData(340.0, 312.0, "walkX")]          // the next hex to the right
    [InlineData(double.NaN, 277.0, "walkX")]
    [InlineData(240.0, double.PositiveInfinity, "walkX")]
    public void WalkTo_PointOutsideTheHexOrInvalid_Throws(double x, double y, string key)
    {
        var piece = new MapToken();
        piece.MoveTo(4, 4);

        var act = () => piece.WalkTo(x, y, 0);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey(key);
    }

    [Fact]
    public void WalkTo_InvalidYaw_Throws()
    {
        var piece = new MapToken();
        piece.MoveTo(4, 4);

        var act = () => piece.WalkTo(240, 277, double.NaN);

        act.Should().Throw<DomainValidationException>().Which.Errors.Should().ContainKey("walkYaw");
    }

    [Fact]
    public void MoveTo_ClearsTheWalkPoint()
    {
        var piece = new MapToken();
        piece.MoveTo(4, 4);
        piece.WalkTo(285, 315, 1);

        piece.MoveTo(4, 4);

        (piece.WalkX, piece.WalkY, piece.WalkYaw).Should().Be(((double?)null, (double?)null, (double?)null));
    }
}
