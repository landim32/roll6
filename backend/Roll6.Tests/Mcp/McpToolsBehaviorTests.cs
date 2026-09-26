using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using Roll6.API.Mcp.Tools;
using Roll6.Domain.Exceptions;
using Roll6.Domain.Interfaces;
using Roll6.DTO.Campaign;
using Roll6.DTO.Common;
using Roll6.DTO.Image;
using Roll6.DTO.MapToken;
using Roll6.DTO.Turn;

namespace Roll6.Tests.Mcp;

/// <summary>Tools call the same services as the controllers, with the caller's id and the same arguments (020 SC-002).</summary>
public class McpToolsBehaviorTests
{
    private const long USER = 7;
    private readonly IHttpContextAccessor _http;

    public McpToolsBehaviorTests()
    {
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(JwtRegisteredClaimNames.Sub, USER.ToString()) }, "test"))
        };
        _http = new HttpContextAccessor { HttpContext = context };
    }

    [Fact]
    public async Task MoveMapToken_PassesTheCallerAndThePosition()
    {
        var pieces = new Mock<IMapTokenService>();
        pieces.Setup(s => s.MoveAsync(USER, 42, It.IsAny<MapTokenPositionInfo>()))
            .ReturnsAsync((long _, long id, MapTokenPositionInfo p) => new MapTokenInfo { MapTokenId = id, X = p.X, Y = p.Y, Look = p.Look ?? 0 });

        var result = await MapTokenTools.MoveMapToken(pieces.Object, _http, 42, 2, 0, 5);

        (result.IsError ?? false).Should().BeFalse();
        pieces.Verify(s => s.MoveAsync(USER, 42, It.Is<MapTokenPositionInfo>(p => p.X == 2 && p.Y == 0 && p.Look == 5)), Times.Once);
        result.StructuredContent!.Value.GetProperty("look").GetInt32().Should().Be(5);
    }

    [Fact]
    public async Task ListCampaigns_MineUsesTheCaller_OtherwiseAll()
    {
        var campaigns = new Mock<ICampaignService>();
        campaigns.Setup(s => s.ListAsync(It.IsAny<PageQuery>(), It.IsAny<long?>())).ReturnsAsync(new PagedList<CampaignInfo>());

        await CampaignTools.ListCampaigns(campaigns.Object, _http, page: 2, pageSize: 500, search: "  ", mine: true);
        await CampaignTools.ListCampaigns(campaigns.Object, _http);

        campaigns.Verify(s => s.ListAsync(It.Is<PageQuery>(q => q.Page == 2 && q.PageSize == PageQuery.MAX_PAGE_SIZE && q.Search == null), USER), Times.Once);
        campaigns.Verify(s => s.ListAsync(It.Is<PageQuery>(q => q.Page == 1 && q.PageSize == 20), null), Times.Once);
    }

    [Fact]
    public async Task DeleteCampaign_OfSomeoneElse_IsA403ToolError()
    {
        var campaigns = new Mock<ICampaignService>();
        campaigns.Setup(s => s.DeleteAsync(USER, 10)).ThrowsAsync(new UnauthorizedAccessException("Apenas o mestre pode alterar ou excluir esta campanha."));

        var result = await CampaignTools.DeleteCampaign(campaigns.Object, _http, 10);

        result.IsError.Should().BeTrue();
        result.StructuredContent!.Value.GetProperty("status").GetInt32().Should().Be(403);
        result.StructuredContent!.Value.GetProperty("detail").GetString().Should().Contain("mestre");
    }

    [Fact]
    public async Task CreateCampaign_ValidationErrors_ComeBackPerField()
    {
        var campaigns = new Mock<ICampaignService>();
        campaigns.Setup(s => s.CreateAsync(USER, It.IsAny<CampaignInsertInfo>())).ThrowsAsync(new DomainValidationException("name", "O campo name é obrigatório."));

        var result = await CampaignTools.CreateCampaign(campaigns.Object, _http, " ");

        result.IsError.Should().BeTrue();
        result.StructuredContent!.Value.GetProperty("errors").GetProperty("name")[0].GetString().Should().Be("O campo name é obrigatório.");
    }

    [Fact]
    public async Task FinishTurn_PassesForce()
    {
        var turns = new Mock<ITurnService>();
        turns.Setup(s => s.FinishAsync(USER, 10, It.IsAny<TurnFinishInfo>())).ReturnsAsync(new TurnFinishResultInfo { Finished = true, TurnNo = 4 });

        await TurnToolsProxy.Finish(turns.Object, _http);

        turns.Verify(s => s.FinishAsync(USER, 10, It.Is<TurnFinishInfo>(f => f.Force)), Times.Once);
    }

    [Fact]
    public async Task ActInTurn_PassesThePieceAndText()
    {
        var turns = new Mock<ITurnService>();
        turns.Setup(s => s.ActAsync(USER, It.IsAny<TurnActInfo>())).ReturnsAsync(new TurnInfo { TurnId = 1 });

        await TurnTools.ActInTurn(turns.Object, _http, 42, "Ataca o goblin");

        turns.Verify(s => s.ActAsync(USER, It.Is<TurnActInfo>(a => a.MapTokenId == 42 && a.Description == "Ataca o goblin")), Times.Once);
    }

    [Fact]
    public async Task AddObjectToMap_IsAlwaysAnObjectPiece()
    {
        var pieces = new Mock<IMapTokenService>();
        pieces.Setup(s => s.CreateAsync(USER, It.IsAny<MapTokenInsertInfo>())).ReturnsAsync(new MapTokenInfo());

        await MapTokenTools.AddObjectToMap(pieces.Object, _http, mapId: 30, tokenId: 5, x: 1, y: 2);

        pieces.Verify(s => s.CreateAsync(USER, It.Is<MapTokenInsertInfo>(i => i.TokenType == 4 && i.MapId == 30 && i.X == 1 && i.Y == 2)), Times.Once);
    }

    [Fact]
    public async Task UploadImage_DecodesBase64AndInfersTheType()
    {
        var images = new Mock<IImageService>();
        byte[]? received = null;
        images.Setup(s => s.UploadAsync(It.IsAny<Stream>(), It.IsAny<long>(), It.IsAny<string?>()))
            .Callback((Stream stream, long _, string? _) => { using var copy = new MemoryStream(); stream.CopyTo(copy); received = copy.ToArray(); })
            .ReturnsAsync(new ImageUploadInfo { FileName = "0123456789abcdef0123456789abcdef.png" });

        var content = Convert.ToBase64String(Encoding.UTF8.GetBytes("png-bytes"));
        var result = await ImageTools.UploadImage(images.Object, "goblin.PNG", content);

        (result.IsError ?? false).Should().BeFalse();
        Encoding.UTF8.GetString(received!).Should().Be("png-bytes");
        images.Verify(s => s.UploadAsync(It.IsAny<Stream>(), 9, "image/png"), Times.Once);
    }

    [Fact]
    public async Task UploadImage_InvalidBase64_IsA400()
    {
        var result = await ImageTools.UploadImage(Mock.Of<IImageService>(), "a.png", "not base64 !!");

        result.IsError.Should().BeTrue();
        result.StructuredContent!.Value.GetProperty("errors").GetProperty("file").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task WithoutAUser_NothingRuns()
    {
        var campaigns = new Mock<ICampaignService>();

        var result = await CampaignTools.DeleteCampaign(campaigns.Object, new HttpContextAccessor { HttpContext = new DefaultHttpContext() }, 10);

        result.IsError.Should().BeTrue();
        campaigns.Verify(s => s.DeleteAsync(It.IsAny<long>(), It.IsAny<long>()), Times.Never);
    }

    /// <summary>finish_turn lives in CampaignTools (its route is under /api/campaign).</summary>
    private static class TurnToolsProxy
    {
        public static Task Finish(ITurnService turns, IHttpContextAccessor http) =>
            CampaignTools.FinishTurn(turns, http, 10, force: true);
    }
}
