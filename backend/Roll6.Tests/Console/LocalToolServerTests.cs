using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Roll6.Console.Tools;
using Roll6.DTO.Realtime.Console;

namespace Roll6.Tests.Console;

/// <summary>The per-run local MCP server (094): token, the tools of the run, calls forwarded, images returned.</summary>
public sealed class LocalToolServerTests
{
    private static readonly string Png = Convert.ToBase64String(new byte[] { 0x89, 0x50, 0x4E, 0x47, 1, 2, 3 });

    private static List<ToolInfo> Tools()
    {
        using var schema = JsonDocument.Parse("""{"type":"object","properties":{"shots":{"type":"array"}}}""");
        return new List<ToolInfo> { new() { Name = "print_stage", Description = "prints", InputSchema = schema.RootElement.Clone() } };
    }

    private static async Task<JsonElement> PostAsync(HttpClient http, string url, string? token, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
        if (token != null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await http.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var text = await response.Content.ReadAsStringAsync();
        // Streamable HTTP may answer as an event stream: the JSON is on the "data:" line.
        var json = text.TrimStart().StartsWith('{')
            ? text
            : text.Split('\n').Select(l => l.Trim()).First(l => l.StartsWith("data:", StringComparison.Ordinal))["data:".Length..].Trim();
        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    private static object Initialize() => new
    {
        jsonrpc = "2.0", id = 1, method = "initialize",
        @params = new { protocolVersion = "2025-06-18", capabilities = new { }, clientInfo = new { name = "test", version = "1" } },
    };

    [Fact]
    public async Task RequestsWithoutTheTokenAreRefused()
    {
        await using var server = await LocalToolServer.StartAsync(Tools(), (call, _) => Task.FromResult(new ToolResultInfo { CallId = call.CallId }), CancellationToken.None);
        using var http = new HttpClient();

        using var response = await http.PostAsync(server.Url, new StringContent("{}", Encoding.UTF8, "application/json"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        server.Url.Should().StartWith("http://127.0.0.1:").And.EndWith("/mcp");
        server.ToolNames.Should().Equal("print_stage");
    }

    [Fact]
    public async Task ListsTheRunsToolsAndForwardsACallReturningTextAndImages()
    {
        ToolCallInfo? received = null;
        await using var server = await LocalToolServer.StartAsync(Tools(), (call, _) =>
        {
            received = call;
            return Task.FromResult(new ToolResultInfo
            {
                CallId = call.CallId,
                Text = "Print 1: frente",
                Images = new List<ToolImageInfo> { new() { MediaType = "image/png", Data = Png } },
            });
        }, CancellationToken.None);
        using var http = new HttpClient();

        await PostAsync(http, server.Url, server.Token, Initialize());
        var list = await PostAsync(http, server.Url, server.Token, new { jsonrpc = "2.0", id = 2, method = "tools/list" });
        var call = await PostAsync(http, server.Url, server.Token, new
        {
            jsonrpc = "2.0", id = 3, method = "tools/call",
            @params = new { name = "print_stage", arguments = new { shots = new[] { new { view = "front" } } } },
        });

        list.GetProperty("result").GetProperty("tools")[0].GetProperty("name").GetString().Should().Be("print_stage");
        received!.Name.Should().Be("print_stage");
        received.Arguments.GetProperty("shots")[0].GetProperty("view").GetString().Should().Be("front");
        var content = call.GetProperty("result").GetProperty("content");
        content[0].GetProperty("text").GetString().Should().Be("Print 1: frente");
        content[1].GetProperty("type").GetString().Should().Be("image");
        content[1].GetProperty("data").GetString().Should().Be(Png);
    }

    [Fact]
    public void AnErrorResultIsMarkedAsError()
    {
        var result = LocalToolServer.ToResult(ToolResultInfo.Error("c1", "O editor não está aberto."));

        result.IsError.Should().BeTrue();
        result.Content.Should().ContainSingle();
    }
}
