using System.Net;
using System.Text.Json;
using FluentAssertions;
using Roll6.Mcp;
using Roll6.Mcp.Tools;

namespace Roll6.Tests.Mcp;

/// <summary>The MCP gateway sends the right request and hands back the API's answer unchanged (020 SC-002).</summary>
public class McpGatewayTests
{
    private static JsonElement Structured(ModelContextProtocol.Protocol.CallToolResult result) => result.StructuredContent!.Value;

    private static string Text(ModelContextProtocol.Protocol.CallToolResult result) =>
        ((ModelContextProtocol.Protocol.TextContentBlock)result.Content.Single()).Text;

    [Fact]
    public async Task MoveMapToken_SendsThePositionAsTheApiDto()
    {
        var api = new FakeApi { ResponseBody = "{\"mapTokenId\":42,\"x\":2,\"y\":0,\"look\":5}" };

        var result = await MapTokenTools.MoveMapToken(api.Client(), 42, 2, 0, 5);

        (api.Method!.Method, api.PathAndQuery).Should().Be(("PUT", "/api/maptoken/42/position"));
        JsonDocument.Parse(api.Body!).RootElement.GetRawText().Should().Be("{\"x\":2,\"y\":0,\"look\":5}");
        Structured(result).GetProperty("look").GetInt32().Should().Be(5);
    }

    [Fact]
    public async Task ListCampaigns_SendsPagingAndMine_SkippingEmptySearch()
    {
        var api = new FakeApi { ResponseBody = "{\"items\":[],\"page\":2,\"pageSize\":50,\"totalCount\":0}" };

        await CampaignTools.ListCampaigns(api.Client(), page: 2, pageSize: 50, search: "  ", mine: true);

        api.PathAndQuery.Should().Be("/api/campaign?page=2&pageSize=50&mine=true");
    }

    [Fact]
    public async Task Search_IsUrlEncoded()
    {
        var api = new FakeApi { ResponseBody = "{\"items\":[]}" };

        await TokenTools.ListTokens(api.Client(), search: "orc & goblin");

        api.PathAndQuery.Should().Be("/api/token?page=1&pageSize=20&search=orc%20%26%20goblin&mine=false");
    }

    [Fact]
    public async Task Lists_AreWrappedInItems_ForStructuredContent()
    {
        var api = new FakeApi { ResponseBody = "[{\"characterId\":1,\"name\":\"Ação\"}]" };

        var result = await CharacterTools.ListMyCharacters(api.Client());

        Structured(result).GetProperty("items").GetArrayLength().Should().Be(1);
        Text(result).Should().Be("[{\"characterId\":1,\"name\":\"Ação\"}]");
    }

    [Fact]
    public async Task NoContent_IsOk()
    {
        var api = new FakeApi { Status = HttpStatusCode.NoContent };

        var result = await CampaignTools.DeleteCampaign(api.Client(), 10);

        (api.Method!.Method, api.PathAndQuery).Should().Be(("DELETE", "/api/campaign/10"));
        Structured(result).GetProperty("ok").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task ApiProblemDetails_ComeBackAsToolErrors_Unchanged()
    {
        var api = new FakeApi
        {
            Status = HttpStatusCode.BadRequest,
            ResponseContentType = "application/problem+json",
            ResponseBody = "{\"type\":\"https://tools.ietf.org/html/rfc9110#section-15.5.1\",\"title\":\"One or more validation errors occurred.\",\"status\":400,\"errors\":{\"name\":[\"O campo name é obrigatório.\"]}}"
        };

        var result = await CampaignTools.CreateCampaign(api.Client(), " ");

        result.IsError.Should().BeTrue();
        Structured(result).GetProperty("status").GetInt32().Should().Be(400);
        Structured(result).GetProperty("errors").GetProperty("name")[0].GetString().Should().Be("O campo name é obrigatório.");
    }

    [Fact]
    public async Task PlainTextErrors_AndEmptyOnes_GetAStatus()
    {
        var plain = new FakeApi { Status = HttpStatusCode.InternalServerError, ResponseContentType = "text/plain", ResponseBody = "Falhou" };
        var empty = new FakeApi { Status = HttpStatusCode.Unauthorized, ResponseBody = "" };

        var error = await UserTools.GetMyProfile(plain.Client());
        var unauthorized = await UserTools.GetMyProfile(empty.Client());

        (Structured(error).GetProperty("status").GetInt32(), Structured(error).GetProperty("detail").GetString()).Should().Be((500, "Falhou"));
        Structured(unauthorized).GetProperty("status").GetInt32().Should().Be(401);
    }

    [Fact]
    public async Task ForwardsTheJwt_WhenThereIsNoApiKey()
    {
        var api = new FakeApi();

        await UserTools.GetMyProfile(api.Client(apiKey: null, authorization: "Bearer abc"));

        (api.ApiKeyHeader, api.AuthorizationHeader).Should().Be(((string?)null, "Bearer abc"));
    }

    [Fact]
    public async Task UploadImage_SendsMultipartWithTheInferredType()
    {
        var api = new FakeApi { ResponseBody = "{\"fileName\":\"0123456789abcdef0123456789abcdef.png\",\"url\":null}" };

        var result = await ImageTools.UploadImage(api.Client(), "goblin.PNG", Convert.ToBase64String(new byte[] { 137, 80, 78, 71 }));

        (result.IsError ?? false).Should().BeFalse();
        (api.Method!.Method, api.PathAndQuery, api.ContentType).Should().Be(("POST", "/api/image", "multipart/form-data"));
        api.Body.Should().Contain("name=file").And.Contain("filename=goblin.PNG").And.Contain("Content-Type: image/png");
    }

    [Fact]
    public async Task UploadImage_InvalidBase64_IsA400_WithoutCallingTheApi()
    {
        var api = new FakeApi();

        var result = await ImageTools.UploadImage(api.Client(), "a.png", "not base64 !!");

        result.IsError.Should().BeTrue();
        Structured(result).GetProperty("errors").GetProperty("file").GetArrayLength().Should().Be(1);
        api.Method.Should().BeNull();
    }

    [Fact]
    public async Task ApiDown_IsA502()
    {
        var client = new Roll6ApiClient(new HttpClient(new ThrowingHandler()) { BaseAddress = new Uri("http://api:8080") },
            new Microsoft.AspNetCore.Http.HttpContextAccessor());

        var result = await UserTools.GetMyProfile(client);

        Structured(result).GetProperty("status").GetInt32().Should().Be(502);
    }

    private sealed class ThrowingHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw new HttpRequestException("connection refused");
    }
}
